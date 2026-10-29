import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { fromNodeHeaders } from "better-auth/node";

import { env } from "@/config/env";
import { auth } from "@/auth";
import { isMember } from "@/services/conversation.service";
import { createSocketRateLimit } from "./socketRateLimit";
import { registerMessageHandlers } from "./messageHandlers";

export function createSocketServer(httpServer: HttpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: env.FRONTEND_URL,
            credentials: true,
        },
    });

    //Handshake gate - same trust path as REST

    io.use(async (socket, next) => {
        try {
            const sessionData = await auth.api.getSession({
                headers: fromNodeHeaders(socket.handshake.headers),
            });
            if (!sessionData?.user) return next(new Error("unauthorized"));
            socket.data.user = sessionData.user;
            socket.data.session = sessionData.session;
            next();
        } catch {
            next(new Error("unauthorized"));
        }
    });

    // One limiter for the whole server; per-socket buckets inside

    const limiter = createSocketRateLimit({
        "message:send": { max: 10, windowMs: 5000},
    });

    io.on("connection", (socket) => {

        // Membership-gated server-side room join

        socket.on("conversation:join", async (payload: unknown, ack?: (result: unknown) => void) => {
            const respond = (data: unknown) => (typeof ack === "function" ? ack(data) : undefined);
            const user = socket.data.user as { id: string } | undefined;
            if (!user) return respond({ ok: false, error: "unauthorized" });

            const id = (payload as { conversationId?: unknown })?.conversationId;
            if (typeof id !== "string" || !id) return respond({ ok: false, error: "validation" });

            try{
                if (!(await isMember(id, user.id))) {
                    return respond({ ok: false, error: "not_found", message: "Conversation not found" });
                }
                socket.join(id);
                respond({ ok: true })
            } catch (err) {
                console.error("conversation:join error", err);
                respond({ ok: false, error: "server" });
            }
        });
        registerMessageHandlers(io, socket, limiter);

        socket.on("disconnect", () => limiter.clear(socket.id));
    });

    return io;
    
}