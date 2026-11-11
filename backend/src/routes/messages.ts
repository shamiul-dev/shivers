import { Router, type Request, type Response } from 'express';
import { z } from "zod";

import { requireAuth, type AuthenticatedRequest } from '@/middleware/requireAuth';
import { getConversationForUser } from "@/services/conversation.service";
import { fetchHistory, editMessage, deleteMessage } from "@/services/message.service";
import { addReaction, removeReaction, REACTION_EMOJIS } from "@/services/reaction.service";
import { getIO } from "@/sockets";

// mergeParams: true - we need : conversationId from the mount path

export const messagesRouter = Router({ mergeParams: true });

const historyQuerySchema = z.object({
    before: z.string().optional(),
    after: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
});

const reactionBodySchema = z.object({
    // z.enum validates AND narrows to the whitelist union — no cast later
    emoji: z.enum(REACTION_EMOJIS),
});

const editBodySchema = z.object({
    body: z.string().min(1, "Message cannot be empty").max(4000),
});

function getConversationId(req: Request): string {
    return String(req.params.conversationId ?? "");
}

/**
 * Shared edit/delete handler: membership gate → service (owner checks +
 * state machine) → map result statuses → fan-out message:updated on success.
 */
async function handleEditOrDelete(
    req: Request,
    res: Response,
    action: "edit" | "delete",
    body?: string
) {
    const authReq = req as AuthenticatedRequest;
    const conversationId = getConversationId(req);
    const messageId = String(req.params.messageId ?? "");

    try {
        const memberRow = await getConversationForUser(conversationId, authReq.user.id);
        if (!memberRow) {
            res.status(404).json({ error: "Conversation not found" });
            return;
        }

        const result = action === "edit"
            ? await editMessage(conversationId, messageId, authReq.user.id, body!)
            : await deleteMessage(conversationId, messageId, authReq.user.id);

        if (result.status === "not_found") {
            res.status(404).json({ error: "Message not found" });
            return;
        }
        if (result.status === "forbidden") {
            res.status(403).json({ error: "You can only modify your own messages" });
            return;
        }
        if (result.status === "already_deleted") {
            res.status(409).json({ error: "Message was deleted" });
            return;
        }

        // Live fan-out to everyone in the conversation room
        const io = getIO();
        io?.to(conversationId).emit("message:updated", result.message);

        res.status(200).json({ message: result.message });
    } catch (error) {
        console.error(`Error handling message ${action}:`, error);
        res.status(500).json({ error: `Failed to ${action} message` });
    }
}

// PATCH /api/conversations/:conversationId/messages/:messageId  { body }

messagesRouter.patch("/:messageId", requireAuth, async (req, res: Response) => {
    const parsed = editBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }
    await handleEditOrDelete(req, res, "edit", parsed.data.body);
});

// DELETE /api/conversations/:conversationId/messages/:messageId

messagesRouter.delete("/:messageId", requireAuth, async (req, res: Response) => {
    await handleEditOrDelete(req, res, "delete");
});

// POST /api/conversations/:conversationId/messages/:messageId/reactions

messagesRouter.post("/:messageId/reactions", requireAuth, async (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const conversationId = getConversationId(req);
    const messageId = String(req.params.messageId ?? "");

    const parsed = reactionBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }

    try {
        const memberRow = await getConversationForUser(conversationId, authReq.user.id);
        if (!memberRow) {
            res.status(404).json({ error: "Conversation not found" });
            return;
        }

        const reactions = await addReaction(conversationId, messageId, authReq.user.id, parsed.data.emoji);
        if (!reactions) {
            res.status(404).json({ error: "Message not found" });
            return;
        }

        // Live fan-out to everyone in the conversation room
        const io = getIO();
        io?.to(conversationId).emit("message:reactions", { messageId, reactions });

        res.status(200).json({ messageId, reactions });
    } catch (error) {
        console.error("Error adding reaction:", error);
        res.status(500).json({ error: "Failed to add reaction" });
    }
});

// DELETE /api/conversations/:conversationId/messages/:messageId/reactions

messagesRouter.delete("/:messageId/reactions", requireAuth, async (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const conversationId = getConversationId(req);
    const messageId = String(req.params.messageId ?? "");

    const parsed = reactionBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }

    try {
        const memberRow = await getConversationForUser(conversationId, authReq.user.id);
        if (!memberRow) {
            res.status(404).json({ error: "Conversation not found" });
            return;
        }

        const reactions = await removeReaction(conversationId, messageId, authReq.user.id, parsed.data.emoji);
        if (!reactions) {
            res.status(404).json({ error: "Message not found" });
            return;
        }

        const io = getIO();
        io?.to(conversationId).emit("message:reactions", { messageId, reactions });

        res.status(200).json({ messageId, reactions });
    } catch (error) {
        console.error("Error removing reaction:", error);
        res.status(500).json({ error: "Failed to remove reaction" });
    }
});

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
        }, authReq.user.id);

        res.status(200).json({
            messages: result.messages,
            hasOlder: result.hasOlder,
        });
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});