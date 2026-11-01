import { Router, type Response } from 'express';
import { z } from "zod";

import { requireAuth, type AuthenticatedRequest } from '@/middleware/requireAuth';
import {
    listConversations,
    createRoom,
    createOrGetDm,
    getConversationForUser,
    markRead,
} from "@/services/conversation.service";

export const conversationsRouter = Router();

const createRoomSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
});

const createDmSchema = z.object({
    userId: z.string().min(1, "userId is required"),
});

// GET /api/conversations - my conversation list

conversationsRouter.get("/", requireAuth, async (req, res: Response) => {
    const authreq = req as AuthenticatedRequest;

    try {
        const result = await listConversations(authreq.user.id);
        res.status(200).json({ conversations: result });
    } catch (error) {
        console.error("Error listing conversations:", error);
        res.status(500).json({ error: "Failed to list conversation" });
    }
});

// POST /api/conversations - create a room

conversationsRouter.post("/", requireAuth, async (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const parsed = createRoomSchema.safeParse(req.body);

    if(!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }

    try {
        const conversation = await createRoom(authReq.user.id, parsed.data.name);
        res.status(201).json({ conversation });
    } catch (error) {
        console.error("Error creating room:", error);
        res.status(500).json({ error: "Failed to create room" });
    }
});

// POST /api/conversations/dm - create or reuse a DM

conversationsRouter.post("/dm", requireAuth, async (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const parsed = createDmSchema.safeParse(req.body);

    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }

    if (parsed.data.userId === authReq.user.id) {
        res.status(400).json({ error: "Cannot start a DM with yourself"});
        return;
    }

    try {
        const result = await createOrGetDm(authReq.user.id, parsed.data.userId);
        if (!result) {
            res.status(404).json({ error: "User not found" })
            return;
        }
        res.status(result.created ? 201 : 200).json({ conversation: result.conversation });
    } catch (error) {
        console.error("Error creating DM:", error);
        res.status(500).json({ error: "Failed to create DM" });
    }
});

// GET /api/conversations/:id - details, membership-gated

conversationsRouter.get("/:id", requireAuth, async (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const conversationId = String(id);

    try {
        const row = await getConversationForUser(conversationId, authReq.user.id);
        if (!row) {
            res.status(404).json({ error: "Conversation not found" });
            return;
        }
        res.status(200).json({
            conversation: row.conversation,
            membership: row.membership,
        });
    } catch (error) {
        console.error("Error fetching conversation:", error);
        res.status(500).json({ error: "Failed to fetch conversation"});
    }
});

// POST /api/conversations/:id/read, membership-gated

conversationsRouter.post("/:id/read", requireAuth, async (req, res: Response) => {
    const authreq = req as AuthenticatedRequest;
    const { id } = req.params;
    const conversationId = String(id);

    try {
        const messageId = typeof req.body?.messageId === "string" ? req.body.messageId : undefined;
        const updated = await markRead(conversationId, authreq.user.id, messageId);
        if(!updated) {
            res.status(404).json({ error: "Conversation not found" });
            return;
        }
        res.status(200).json({ lastReadMessageId: updated.lastReadMessageId });
    } catch (error) {
        console.error("Error marking conversation read", error);
        res.status(500).json({ error: "Failed to mark conversation read" });
    }
});