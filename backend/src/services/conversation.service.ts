import { and, desc, eq, inArray, ne } from "drizzle-orm";

import { db } from "@/db";
import { conversations, conversationMembers, messages, profiles, user } from "@/db/schema";
import { chatEvents } from "./chatEvents";

/**
 * Membership check — used by REST routes and (later) socket handlers.
 */

export async function isMember(conversationId: string, userId: string): Promise<boolean> {
    const rows = await db
        .select({ conversationId: conversationMembers.conversationId })
        .from(conversationMembers)
        .where(
            and(
                eq(conversationMembers.conversationId, conversationId),
                eq(conversationMembers.userId, userId)
            )
        )
        .limit(1);
    return rows.length > 0;
}

/**
 * dm_key = smaller_id + ":" + larger_id (PDF §6)
 */

export function buildDmKey(userA: string, userB: string): string {
    const [a, b] = [userA, userB].sort();
    return `${a}:${b}`;
}

/**
 * List the caller's conversations with last message, unread count, and sorted by activity.
 * DMs get `otherUser` populated; rooms get `otherUser: undefined`.
 */

export async function listConversations(userId: string) {
    const myRows = await db
        .select({
            conversationId: conversationMembers.conversationId,
            role: conversationMembers.role,
            joinedAt: conversationMembers.joinedAt,
            lastReadMessageId: conversationMembers.lastReadMessageId,
        })
        .from(conversationMembers)
        .where(eq(conversationMembers.userId, userId));
    
    if (myRows.length === 0) {
        return [];
    }

    const ids = myRows.map((row) => row.conversationId);

    const [convs, members, recentMessages] = await Promise.all([
        db.select().from(conversations).where(inArray(conversations.id, ids)),
        db.select({
            conversationId: conversationMembers.conversationId,
            userId: user.id,
            name: user.name,
            image: user.image,
            username: profiles.username,
            avatarKey: profiles.avatarKey,
        })
            .from(conversationMembers)
            .innerJoin(user, eq(conversationMembers.userId, user.id))
            .leftJoin(profiles, eq(profiles.userId, user.id))
            .where(inArray(conversationMembers.conversationId, ids)),
        db.select({
            id: messages.id,
            conversationId: messages.conversationId,
            body: messages.body,
            senderId: messages.senderId,
            type: messages.type,
            createdAt: messages.createdAt,
        })
            .from(messages)
            .where(inArray(messages.conversationId, ids))
            .orderBy(desc(messages.createdAt)),
    ]);

    const convMap = new Map(convs.map((c) => [c.id, c]));

    // For DMs: the first participant who isn't me
    const otherMap = new Map<string, (typeof members)[number]>();
    for (const m of members) {
        if (m.userId === userId) continue;
        if (!otherMap.has(m.conversationId)) otherMap.set(m.conversationId, m);
    }

    // Last message per conversation & unread calculation
    const lastMessageMap = new Map<string, (typeof recentMessages)[number]>();
    const unreadMap = new Map<string, number>();
    const membershipMap = new Map(myRows.map((r) => [r.conversationId, r]));
    const readCursorReached = new Set<string>();

    for (const msg of recentMessages) {
        if (!lastMessageMap.has(msg.conversationId)) {
            lastMessageMap.set(msg.conversationId, msg);
        }

        const membership = membershipMap.get(msg.conversationId);
        // If we encountered the member's last read message, mark cursor reached for this conversation
        if (membership?.lastReadMessageId && msg.id === membership.lastReadMessageId) {
            readCursorReached.add(msg.conversationId);
        }

        // Count unread: only messages before the read cursor, and only messages sent by someone else
        if (!readCursorReached.has(msg.conversationId)) {
            if (msg.senderId !== userId) {
                unreadMap.set(msg.conversationId, (unreadMap.get(msg.conversationId) ?? 0) + 1);
            }
        }
    }

    const result = myRows.map((row) => {
        const conv = convMap.get(row.conversationId);
        if (!conv) return null;
        const lastMsg = lastMessageMap.get(conv.id) ?? null;
        return {
            ...conv,
            role: row.role,
            joinedAt: row.joinedAt,
            otherUser: conv.type === "dm" ? otherMap.get(conv.id) ?? null : undefined,
            lastMessage: lastMsg,
            unreadCount: unreadMap.get(conv.id) ?? 0,
        };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

    // Sort by most recent activity (latest message time, fallback to conversation createdAt)
    result.sort((a, b) => {
        const timeA = a.lastMessage
            ? new Date(a.lastMessage.createdAt).getTime()
            : new Date(a.createdAt).getTime();
        const timeB = b.lastMessage
            ? new Date(b.lastMessage.createdAt).getTime()
            : new Date(b.createdAt).getTime();
        return timeB - timeA;
    });

    return result;
}

/**
 * Create a room. Creator becomes owner.
 */

export async function createRoom(userId: string, name: string) {
    const id = crypto.randomUUID();
    const [conversation] = await db
        .insert(conversations)
        .values({ id, type: "room", name, createdBy: userId })
        .returning();
    
    await db.insert(conversationMembers).values({
        conversationId: id,
        userId,
        role: "owner",
    });

    chatEvents.emit("conversation:created", {
        conversation,
        userIds: [userId],
    });

    return conversation;
}

/**
 * Create a DM, or return the existing one (exactly one per user pair).
 * Returns { conversation, created } so the route can send 200 vs 201.
 */

export async function createOrGetDm(userId: string, targetUserId: string) {
    // Target user must exist
    const [target] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, targetUserId))
        .limit(1);
    
    if (!target) return null;

    const dmKey = buildDmKey(userId, targetUserId);

    // Existing DM between these two users?
    const [existing] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.dmKey, dmKey))
        .limit(1);

    if (existing) {
        // If I am somehow not a member of this DM, add me (shouldn't happen in practice)
        if (!(await isMember(existing.id, userId))) {
            await db.insert(conversationMembers).values({
                conversationId: existing.id,
                userId,
                role: "member",
            });
        }
        return { conversation: existing, created: false };
    }

    const id = crypto.randomUUID();
    const [conversation] = await db
        .insert(conversations)
        .values({ id, type: "dm", dmKey, createdBy: userId })
        .returning();

    await db.insert(conversationMembers).values([
        { conversationId: id, userId, role: "owner" },
        { conversationId: id, userId: targetUserId, role: "owner" },
    ]);

    chatEvents.emit("conversation:created", {
        conversation,
        userIds: [userId, targetUserId],
    });

    return { conversation, created: true };
}

/**
 * Fetch one conversation + the caller's membership row.
 * For DMs, also populates `otherUser`.
 * Returns null when the conversation doesn't exist or caller isn't a member.
 */

export async function getConversationForUser(conversationId: string, userId: string) {
    const [row] = await db
        .select({
            conversation: conversations,
            membership: conversationMembers,
        })
        .from(conversations)
        .innerJoin(
            conversationMembers,
            and(
                eq(conversationMembers.conversationId, conversationId),
                eq(conversationMembers.userId, userId)
            )
        )
        .where(eq(conversations.id, conversationId))
        .limit(1);

    if (!row) return null;

    let otherUser: {
        userId: string;
        name: string;
        image: string | null;
        username: string | null;
        avatarKey: string | null;
    } | null | undefined = undefined;

    if (row.conversation.type === "dm") {
        const [other] = await db
            .select({
                userId: user.id,
                name: user.name,
                image: user.image,
                username: profiles.username,
                avatarKey: profiles.avatarKey,
            })
            .from(conversationMembers)
            .innerJoin(user, eq(conversationMembers.userId, user.id))
            .leftJoin(profiles, eq(profiles.userId, user.id))
            .where(
                and(
                    eq(conversationMembers.conversationId, conversationId),
                    ne(conversationMembers.userId, userId)
                )
            )
            .limit(1);

        otherUser = other ?? null;
    }

    return {
        ...row,
        conversation: {
            ...row.conversation,
            otherUser,
        },
    };
}

/**
 * Mark read: set my cursor to the given messageId, or to the newest message.
 */

export async function markRead(conversationId: string, userId: string, messageId?: string) {
    let cursor = messageId ?? null;

    if(!cursor) {
        const [latest] = await db
            .select({ id: messages.id })
            .from(messages)
            .where(eq(messages.conversationId, conversationId))
            .orderBy(desc(messages.createdAt))
            .limit(1);
        if (!latest) return null; // nothing to read
        cursor = latest.id;
    }

    const [updated] = await db
        .update(conversationMembers)
        .set({ lastReadMessageId: cursor })
        .where(
            and(
                eq(conversationMembers.conversationId, conversationId),
                eq(conversationMembers.userId, userId)
            )
        )
        .returning({ lastReadMessageId: conversationMembers.lastReadMessageId })
    return updated ?? null;
}

/**
 * List all members of a conversation. Caller must be a member.
 */
export async function listMembers(conversationId: string, callerUserId: string) {
    if (!(await isMember(conversationId, callerUserId))) {
        return null;
    }

    const rows = await db
        .select({
            userId: user.id,
            name: user.name,
            image: user.image,
            username: profiles.username,
            avatarKey: profiles.avatarKey,
            role: conversationMembers.role,
            joinedAt: conversationMembers.joinedAt,
        })
        .from(conversationMembers)
        .innerJoin(user, eq(conversationMembers.userId, user.id))
        .leftJoin(profiles, eq(profiles.userId, user.id))
        .where(eq(conversationMembers.conversationId, conversationId));

    return rows;
}

/**
 * Add a member to a channel room.
 */
export async function addMember(
    conversationId: string,
    callerUserId: string,
    targetUserId: string,
    role: "member" | "admin" = "member"
) {
    // 1. Caller must be a member of the conversation
    if (!(await isMember(conversationId, callerUserId))) {
        return { error: "forbidden" as const, message: "You are not a member of this conversation" };
    }

    // 2. Conversation must exist and be a channel room
    const [conv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

    if (!conv) {
        return { error: "not_found" as const, message: "Conversation not found" };
    }

    if (conv.type !== "room") {
        return { error: "bad_request" as const, message: "Cannot add members to a direct message" };
    }

    // 3. Target user must exist
    const [target] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, targetUserId))
        .limit(1);

    if (!target) {
        return { error: "not_found" as const, message: "Target user not found" };
    }

    // 4. Target already a member?
    if (await isMember(conversationId, targetUserId)) {
        return { error: "conflict" as const, message: "User is already a member of this channel" };
    }

    // 5. Insert membership row
    const [membership] = await db
        .insert(conversationMembers)
        .values({
            conversationId,
            userId: targetUserId,
            role,
        })
        .returning();

    // 6. Real-time socket sync (published as domain events; sockets subscribe)
    chatEvents.emit("conversation:created", {
        conversation: conv,
        userIds: [targetUserId],
    });
    chatEvents.emit("conversation:member_joined", {
        conversationId,
        userId: targetUserId,
        role,
    });

    return { ok: true as const, membership, conversation: conv };
}
