import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { messageReactions, messages } from "@/db/schema";

/**
 * Fixed reaction set — mirrored on the frontend (QuickReactionBar) and must
 * be edited on BOTH sides. The server enforces this as a whitelist; no other
 * emoji can be persisted.
 */
export const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export type ReactionAggregate = {
    emoji: ReactionEmoji;
    count: number;
    reactedByMe: boolean;
};

/**
 * Add a reaction (idempotent): unique(messageId, userId, emoji) makes a
 * double-tap a no-op rather than an error.
 */
export async function addReaction(
    conversationId: string,
    messageId: string,
    userId: string,
    emoji: ReactionEmoji
) {
    // Guard the path-stated conversation: reject reactions whose messageId
    // belongs to another conversation (cross-conversation ID injection)
    const [message] = await db
        .select({ id: messages.id })
        .from(messages)
        .where(and(eq(messages.id, messageId), eq(messages.conversationId, conversationId)))
        .limit(1);
    if (!message) return null;

    await db
        .insert(messageReactions)
        .values({ id: crypto.randomUUID(), messageId, userId, emoji })
        .onConflictDoNothing();

    return (await getReactionsForMessages([messageId], userId))[messageId] ?? [];
}

/** Remove own reaction for an emoji. Returns null if message not in conversation. */
export async function removeReaction(
    conversationId: string,
    messageId: string,
    userId: string,
    emoji: ReactionEmoji
) {
    const [message] = await db
        .select({ id: messages.id })
        .from(messages)
        .where(and(eq(messages.id, messageId), eq(messages.conversationId, conversationId)))
        .limit(1);
    if (!message) return null;

    await db
        .delete(messageReactions)
        .where(
            and(
                eq(messageReactions.messageId, messageId),
                eq(messageReactions.userId, userId),
                eq(messageReactions.emoji, emoji)
            )
        );

    return (await getReactionsForMessages([messageId], userId))[messageId] ?? [];
}

/**
 * Aggregate reactions for a page of messages: one query, grouped in TS
 * (page size <= 50). Ordered by count desc, then creation order for
 * stable rendering.
 */
export async function getReactionsForMessages(
    messageIds: string[],
    forUserId: string
): Promise<Record<string, ReactionAggregate[]>> {
    if (messageIds.length === 0) return {};

    const rows = await db
        .select({
            messageId: messageReactions.messageId,
            emoji: messageReactions.emoji,
            userId: messageReactions.userId,
            createdAt: messageReactions.createdAt,
        })
        .from(messageReactions)
        .where(inArray(messageReactions.messageId, messageIds))
        .orderBy(messageReactions.createdAt);

    const grouped: Record<string, Map<string, { count: number; reactedByMe: boolean; first: number }>> = {};
    for (const row of rows) {
        const messageGroup = (grouped[row.messageId] ??= new Map());
        const agg = messageGroup.get(row.emoji) ?? { count: 0, reactedByMe: false, first: messageGroup.size };
        agg.count++;
        if (row.userId === forUserId) agg.reactedByMe = true;
        messageGroup.set(row.emoji, agg);
    }

    const out: Record<string, ReactionAggregate[]> = {};
    for (const [messageId, map] of Object.entries(grouped)) {
        out[messageId] = [...map.entries()]
            .sort((a, b) => {
                if (b[1].count !== a[1].count) return b[1].count - a[1].count;
                return a[1].first - b[1].first; // stable when counts tie
            })
            .map(([emoji, agg]) => ({
                emoji: emoji as ReactionEmoji,
                count: agg.count,
                reactedByMe: agg.reactedByMe,
            }));
    }
    return out;
}
