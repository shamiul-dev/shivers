import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { fromNodeHeaders } from "better-auth/node";
import { and, eq, gt } from "drizzle-orm";

import { env } from "@/config/env";
import { auth } from "@/auth";
import { db } from "@/db";
import { session as sessionTable, user as userTable, conversationMembers } from "@/db/schema";
import { isMember, markRead } from "@/services/conversation.service";
import { chatEvents, type ConversationCreatedEvent, type ConversationMemberJoinedEvent } from "@/services/chatEvents";
import { createSocketRateLimit } from "./socketRateLimit";
import { registerMessageHandlers } from "./messageHandlers";
import { registerTypingHandlers } from "./typingHandlers";
import { presenceManager } from "./presenceManager";
import { setIO, getIO } from "./io";

export { getIO };

// better-auth default session cookie (must match the auth config; mirrors
// frontend/lib/auth-constants.ts)
const SESSION_COOKIE_NAME = "better-auth.session_token";

export function createSocketServer(httpServer: HttpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: env.FRONTEND_URL,
            credentials: true,
        },
    });
    setIO(io);

    // Handshake gate - supports cookie header, socket.auth.token, and DB fallback
    io.use(async (socket, next) => {
        try {
            const rawCookie = socket.handshake.headers.cookie;
            const authToken =
                typeof socket.handshake.auth?.token === "string"
                    ? socket.handshake.auth.token
                    : undefined;

            let authenticatedUser: unknown = null;
            let authenticatedSession: unknown = null;

            // 1. Try Better Auth getSession
            const cookieValue = rawCookie
                ? rawCookie
                : authToken
                ? `${SESSION_COOKIE_NAME}=${authToken}`
                : "";

            if (cookieValue) {
                const reqHeaders = new Headers(fromNodeHeaders(socket.handshake.headers));
                reqHeaders.set("cookie", cookieValue);
                const sessionData = await auth.api.getSession({
                    headers: reqHeaders,
                });
                if (sessionData?.user) {
                    authenticatedUser = sessionData.user;
                    authenticatedSession = sessionData.session;
                }
            }

            // 2. Direct session fallback: in cross-origin environments where cookie is passed as auth.token
            if (!authenticatedUser && authToken) {
                const cleanToken = authToken.split(".")[0];
                const [dbSession] = await db
                    .select()
                    .from(sessionTable)
                    .where(
                        and(
                            eq(sessionTable.token, cleanToken),
                            gt(sessionTable.expiresAt, new Date())
                        )
                    )
                    .limit(1);

                if (dbSession) {
                    const [dbUser] = await db
                        .select()
                        .from(userTable)
                        .where(eq(userTable.id, dbSession.userId))
                        .limit(1);

                    if (dbUser) {
                        authenticatedUser = dbUser;
                        authenticatedSession = dbSession;
                    }
                }
            }

            if (!authenticatedUser) {
                return next(new Error("unauthorized"));
            }

            socket.data.user = authenticatedUser;
            socket.data.session = authenticatedSession;
            next();
        } catch (err) {
            console.error("Socket handshake error:", err);
            next(new Error("unauthorized"));
        }
    });

    // One limiter for the whole server; per-socket buckets inside
    const limiter = createSocketRateLimit({
        "message:send": { max: 10, windowMs: 5000 },
        "typing:start": { max: 10, windowMs: 5000 },
    });

    // Subscribe to service-layer domain events; room naming lives here only.
    // (Room names: "user:{id}" for personal rooms, conversation id as room id)
    const userRoom = (userId: string) => `user:${userId}`;

    const onConversationCreated = ({ conversation, userIds }: ConversationCreatedEvent) => {
        for (const userId of userIds) {
            try {
                io.in(userRoom(userId)).socketsJoin(conversation.id);
                io.to(userRoom(userId)).emit("conversation:created", conversation);
            } catch (err) {
                console.error("conversation:created socket sync error:", err);
            }
        }
    };

    const onConversationMemberJoined = ({ conversationId, userId, role }: ConversationMemberJoinedEvent) => {
        try {
            io.to(conversationId).emit("conversation:member_joined", {
                conversationId,
                userId,
                role,
            });
        } catch (err) {
            console.error("conversation:member_joined socket sync error:", err);
        }
    };

    chatEvents.on("conversation:created", onConversationCreated);
    chatEvents.on("conversation:member_joined", onConversationMemberJoined);

    // Instance-scoped listeners on the shared emitter: detach exactly ours
    // when this server dies — concurrent servers keep their own handlers and
    // no event is ever delivered twice to one io.
    httpServer.once("close", () => {
        chatEvents.off("conversation:created", onConversationCreated);
        chatEvents.off("conversation:member_joined", onConversationMemberJoined);
    });

    io.on("connection", async (socket) => {
        const user = socket.data.user as { id: string } | undefined;
        if (user?.id) {
            socket.join(`user:${user.id}`);
            const { isFirstConnection } = presenceManager.trackConnection(user.id, socket.id);
            if (isFirstConnection) {
                socket.broadcast.emit("presence:update", { userId: user.id, status: "online" });
            }

            try {
                const myConvs = await db
                    .select({ conversationId: conversationMembers.conversationId })
                    .from(conversationMembers)
                    .where(eq(conversationMembers.userId, user.id));
                for (const row of myConvs) {
                    socket.join(row.conversationId);
                }
            } catch (err) {
                console.error("Auto-join error:", err);
            }
        }

        // Bulk presence lookup for peer users
        socket.on("presence:query", (payload: unknown, ack?: (result: unknown) => void) => {
            const respond = (data: unknown) => (typeof ack === "function" ? ack(data) : undefined);
            const userIds = (payload as { userIds?: unknown })?.userIds;
            if (!Array.isArray(userIds)) return respond({ onlineUserIds: [] });
            const validIds = userIds.filter((id): id is string => typeof id === "string").slice(0, 100);
            respond({ onlineUserIds: presenceManager.getOnlineUserIds(validIds) });
        });

        // Membership-gated server-side room join
        socket.on("conversation:join", async (payload: unknown, ack?: (result: unknown) => void) => {
            const respond = (data: unknown) => (typeof ack === "function" ? ack(data) : undefined);
            const user = socket.data.user as { id: string } | undefined;
            if (!user) return respond({ ok: false, error: "unauthorized" });

            const id = (payload as { conversationId?: unknown })?.conversationId;
            if (typeof id !== "string" || !id) return respond({ ok: false, error: "validation" });

            try {
                if (!(await isMember(id, user.id))) {
                    return respond({ ok: false, error: "not_found", message: "Conversation not found" });
                }
                socket.join(id);
                respond({ ok: true });
            } catch (err) {
                console.error("conversation:join error", err);
                respond({ ok: false, error: "server" });
            }
        });

        // Mark conversation read
        socket.on("conversation:read", async (payload: unknown, ack?: (result: unknown) => void) => {
            const respond = (data: unknown) => (typeof ack === "function" ? ack(data) : undefined);
            const user = socket.data.user as { id: string } | undefined;
            if (!user) return respond({ ok: false, error: "unauthorized" });

            const { conversationId, messageId } = (payload ?? {}) as {
                conversationId?: unknown;
                messageId?: unknown;
            };

            if (typeof conversationId !== "string" || !conversationId) {
                return respond({ ok: false, error: "validation" });
            }

            try {
                if (!(await isMember(conversationId, user.id))) {
                    return respond({ ok: false, error: "not_found" });
                }

                const cursor = typeof messageId === "string" ? messageId : undefined;
                const updated = await markRead(conversationId, user.id, cursor);
                respond({ ok: true, lastReadMessageId: updated?.lastReadMessageId });
            } catch (err) {
                console.error("conversation:read error", err);
                respond({ ok: false, error: "server" });
            }
        });

        registerMessageHandlers(io, socket, limiter);
        registerTypingHandlers(io, socket, limiter);

        socket.on("disconnect", () => {
            limiter.clear(socket.id);
            if (user?.id) {
                const { isLastConnection } = presenceManager.untrackConnection(user.id, socket.id);
                if (isLastConnection) {
                    socket.broadcast.emit("presence:update", { userId: user.id, status: "offline" });
                }
            }
        });
    });

    return io;
}
