import { Router, type Request, type Response } from 'express';
import { z } from "zod";

import { requireAuth, type AuthenticatedRequest } from '@/middleware/requireAuth';
import { getConversationForUser } from "@/services/conversation.service";
import { fetchHistory } from "@/services/message.service";

// mergeParams: true - we need : conversationId from the mount path

export const messagesRouter = Router({ mergeParams: true });

const historyQuerySchema = z.object({
    before: z.string().optional(),
    after: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
});

function getConversationId(req: Request): string {
    return String(req.params.conversationId ?? "");
}

// GET /api/conversations/:conversationId/messages?before=&limit= (and ?after=)

messagesRouter.get("/", requireAuth, async (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const conversationId = getConversationId(req);

    const parsed = historyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }

    if (parsed.data.before && parsed.data.after) {
        res.status(400).json({ error: "Use either before or after, not both" });
        return;
    }

    try {
        // Membership gate: one query decides both 404 and authorization
        const memberRow = await getConversationForUser(conversationId, authReq.user.id);
        if (!memberRow) {
            res.status(404).json({ error: "Conversation not found" });
            return;
        }

        const result = await fetchHistory(conversationId, {
            before: parsed.data.before,
            after: parsed.data.after,
            limit: parsed.data.limit,
        });

        res.status(200).json({
            messages: result.messages,
            hasOlder: result.hasOlder,
        });
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});