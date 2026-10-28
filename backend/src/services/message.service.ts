import { asc, desc, eq, gt, lt, or, and } from "drizzle-orm";

import { db } from "@/db"
import { messages } from "@/db/schema";

/**
 * Cursor pagination for message history.
 *
 * Message ids are random UUIDs -> NOT time-ordered, so cursors must be
 * (created_at, id) tuples, compared with the same ordering we sort by.
 */

export async function fetchHistory(
    conversationId: string,
    opts: { before?: string; after?: string; limit: number }
){
    const { before, after, limit } = opts;

    // Fetch limit + 1 to detect if another page exists
    if (after) {
        // Gap-fill: newest-first after a cursor, ascending return
        const [cursor] = await db
            .select({ createdAt: messages.createdAt })
            .from(messages)
            .where(eq(messages.id, after))
            .limit(1);
        
        if (!cursor) return { messages: [], hasOlder: false};

        const rows = await db
            .select()
            .from(messages)
            .where(
                and(
                    eq(messages.conversationId, conversationId),
                    gt(messages.createdAt, cursor.createdAt)
                )
            )
            .orderBy(asc(messages.createdAt), asc(messages.id))
            .limit(limit + 1);
        
        const hasOlder = rows.length > limit;
        return { messages: hasOlder ? rows.slice(0, limit) : rows, hasOlder: false };
    }

    // Standard history: newest up to cursor, descending fetch

    let cursorRow: { createdAt: Date } | undefined;
    if (before) {
        [cursorRow] = await db
        .select({ createdAt: messages.createdAt })
        .from(messages)
        .where(eq(messages.id, before))
        .limit(1);
        if (!cursorRow) return { messages: [], hasOlder: false };
    }

    const rows = await db
        .select()
        .from(messages)
        .where(
            cursorRow
                ? and(
                    eq(messages.conversationId, conversationId),
                    lt(messages.createdAt, cursorRow.createdAt)
                )
                : eq(messages.conversationId, conversationId)
        )
        .orderBy(desc(messages.createdAt), desc(messages.id))
        .limit(limit + 1);
    const hasOlder = rows.length > limit;
    const page = hasOlder ? rows.slice(0, limit): rows;
    // Return chronological order to the client
    return { messages: page.reverse(), hasOlder }
}