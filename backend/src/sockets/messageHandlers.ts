import type { Server, Socket } from "socket.io"
import { z } from "zod";

import { isMember } from "@/services/conversation.service";
import { createMessage } from "@/services/message.service";

const messageSendSchema = z.object({
    conversationId: z.string().min(1),
    clientId: z.string().min(1).max(64),
    body: z.string().trim().min(1, "Message cannot be empty").max(2000),
});

// Structural type matching createSocketRateLimit's return value

export interface SocketRateLimiter {
    check(socketId: string, eventName: string): boolean;
    clear(socketId: string): void;
}

export function registerMessageHandlers(
    io: Server,
    socket: Socket,
    limiter: SocketRateLimiter
) {
    socket.on("message:send", async (payload: unknown, ack?: (result: unknown) => void) => {
        const respond = (data: unknown) => (typeof ack === "function" ? ack(data) : undefined);
        const user = socket.data.user as { id: string } | undefined;
        if (!user) return respond({ ok: false, error: "unauthorized" });

        if (!limiter.check(socket.id, "message:send")) {
            return respond({ ok: false, error: "rate_limited", message: "Slow down" });
        }

        const parsed = messageSendSchema.safeParse(payload);
        if (!parsed.success) {
            return respond({ ok: false, error: "validation", message: parsed.error.issues[0].message });
        }

        const { conversationId, clientId, body } = parsed.data;

        try {
            if (!(await isMember(conversationId, user.id))) {
                return respond({ ok: false, error: "not_found", message: "Conversation not found" });
            }
            const { message, duplicated } = await createMessage(conversationId, user.id, clientId, body);
            io.to(conversationId).emit("message:new", message);
            respond({ ok: true, message, duplicated });
        } catch (err) {
            console.error("message:send error:", err);
            respond({ ok: false, error: "server" });
        }
    });
}