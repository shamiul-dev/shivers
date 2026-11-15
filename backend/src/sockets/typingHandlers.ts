import type { Server, Socket } from "socket.io";
import { z } from "zod";

import { logger } from "@/config/logger";
import { isMember } from "@/services/conversation.service";
import type { SocketRateLimiter } from "./messageHandlers";

const typingSchema = z.object({
    conversationId: z.string().min(1),
});

export function registerTypingHandlers(
    io: Server,
    socket: Socket,
    limiter: SocketRateLimiter
) {
    socket.on("typing:start", async (payload: unknown) => {
        const user = socket.data.user as { id: string } | undefined;
        if (!user) return;

        if (!limiter.check(socket.id, "typing:start")) return;

        const parsed = typingSchema.safeParse(payload);
        if (!parsed.success) return;

        const { conversationId } = parsed.data;
        try {
            if (!(await isMember(conversationId, user.id))) return;
            socket.to(conversationId).emit("typing:start", {
                conversationId,
                userId: user.id,
            });
        } catch (err) {
            logger.error({ err }, "typing:start error");
        }
    });

    socket.on("typing:stop", async (payload: unknown) => {
        const user = socket.data.user as { id: string } | undefined;
        if (!user) return;

        const parsed = typingSchema.safeParse(payload);
        if (!parsed.success) return;

        const { conversationId } = parsed.data;
        try {
            if (!(await isMember(conversationId, user.id))) return;
            socket.to(conversationId).emit("typing:stop", {
                conversationId,
                userId: user.id,
            });
        } catch (err) {
            logger.error({ err }, "typing:stop error");
        }
    });
}

