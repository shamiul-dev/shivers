import { asc, desc, eq, gt, lt, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { messages, attachments } from "@/db/schema";
import { attachSignedUrls } from "@/services/signedUrl.service";
import { getReactionsForMessages } from "@/services/reaction.service";

/**
 * Cursor pagination for message history.
 *
 * Message ids are random UUIDs -> NOT time-ordered, so cursors must be
 * (created_at, id) tuples, compared with the same ordering we sort by.
 */

type MessageRow = typeof messages.$inferSelect;

/**
 * Decorate a page of raw message rows with signed attachment + aggregated
 * reactions (one query per decoration type over the page's ids).
 */
async function decoratePage(page: MessageRow[], forUserId: string) {
    const messageIds = page.map((m) => m.id);

    const attachmentsMap: Record<string, typeof attachments.$inferSelect> = {};
    if (messageIds.length > 0) {
        const attRows = await db
            .select()
            .from(attachments)
            .where(inArray(attachments.messageId, messageIds));
        for (const att of attRows) {
            if (att.messageId) {
                attachmentsMap[att.messageId] = att;
            }
        }
    }

    const reactionsMap = await getReactionsForMessages(messageIds, forUserId);

    return page.map((m) => ({
        ...m,
        attachment: attachmentsMap[m.id] ? attachSignedUrls(attachmentsMap[m.id]) : null,
        reactions: reactionsMap[m.id] ?? [],
    }));
}

export async function fetchHistory(
    conversationId: string,
    opts: { before?: string; after?: string; limit: number },
    forUserId: string
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
        
        if (!cursor) return { messages: [], hasOlder: false };

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
        const page = hasOlder ? rows.slice(0, limit) : rows;

        return { messages: await decoratePage(page, forUserId), hasOlder: false };
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
    const page = hasOlder ? rows.slice(0, limit) : rows;

    // Return chronological order to the client
    return { messages: (await decoratePage(page, forUserId)).reverse(), hasOlder };
}

/**
 * Drizzle wraps driver errors in DrizzleQueryError; the real Postgres error
 * (with its code, e.g. 23505 unique_violation) hangs off .cause. Walk the
 * cause chain to find the code.
 */
function findPostgresErrorCode(error: unknown): string | undefined {
    let chain: unknown = error;
    while (chain && typeof chain === "object") {
        const code = (chain as { code?: unknown }).code;
        if (typeof code === "string" && /^\d{5}$/.test(code)) return code;
        chain = (chain as { cause?: unknown }).cause;
    }
    return undefined;
}

type EditDeleteResult =
    | { status: "not_found" }
    | { status: "forbidden" }
    | { status: "already_deleted" }
    | { status: "ok"; message: Awaited<ReturnType<typeof decoratePage>>[number] };

/** Load one message with full decorations (attachment + reactions). */
async function loadDecorated(conversationId: string, messageId: string, forUserId: string) {
    const [row] = await db
        .select()
        .from(messages)
        .where(and(eq(messages.id, messageId), eq(messages.conversationId, conversationId)))
        .limit(1);
    if (!row) return null;
    const [decorated] = await decoratePage([row], forUserId);
    return decorated;
}

/**
 * Edit own message body. No edit-window policy: `editedAt` marks the change
 * honestly for everyone. Editing a tombstoned message is rejected.
 */
export async function editMessage(
    conversationId: string,
    messageId: string,
    senderId: string,
    body: string
): Promise<EditDeleteResult> {
    const existing = await loadDecorated(conversationId, messageId, senderId);
    if (!existing) return { status: "not_found" };
    if (existing.senderId !== senderId) return { status: "forbidden" };
    if (existing.deletedAt) return { status: "already_deleted" };

    const [updated] = await db
        .update(messages)
        .set({ body, editedAt: new Date() })
        .where(eq(messages.id, messageId))
        .returning();

    const [decorated] = await decoratePage([updated], senderId);
    return { status: "ok", message: decorated };
}

/**
 * Soft delete (own messages only): sets deletedAt, keeps history and media.
 * Idempotent: deleting an already-deleted message returns the tombstone.
 */
export async function deleteMessage(
    conversationId: string,
    messageId: string,
    senderId: string
): Promise<EditDeleteResult> {
    const existing = await loadDecorated(conversationId, messageId, senderId);
    if (!existing) return { status: "not_found" };
    if (existing.senderId !== senderId) return { status: "forbidden" };

    if (existing.deletedAt) return { status: "ok", message: existing };

    const [updated] = await db
        .update(messages)
        .set({ deletedAt: new Date() })
        .where(eq(messages.id, messageId))
        .returning();

    const [decorated] = await decoratePage([updated], senderId);
    return { status: "ok", message: decorated };
}

export async function createMessage(
    conversationId: string,
    senderId: string,
    clientId: string,
    body: string,
    type: string = "text",
    attachmentId?: string
) {
    const id = crypto.randomUUID();
    try {
        const [message] = await db
            .insert(messages)
            .values({ id, conversationId, senderId, type, body, clientId })
            .returning();

        let attachment = null;
        if (attachmentId) {
            const [linked] = await db
                .update(attachments)
                .set({ messageId: id })
                .where(eq(attachments.id, attachmentId))
                .returning();
            attachment = linked ? attachSignedUrls(linked) : null;
        }

        return { message: { ...message, attachment }, duplicated: false };
    } catch (error: any) {
        if (findPostgresErrorCode(error) === "23505") {
            const [existing] = await db
                .select()
                .from(messages)
                .where(and(eq(messages.conversationId, conversationId), eq(messages.clientId, clientId)))
                .limit(1);
            if (existing) {
                const [att] = await db
                    .select()
                    .from(attachments)
                    .where(eq(attachments.messageId, existing.id))
                    .limit(1);
                return {
                    message: {
                        ...existing,
                        attachment: att ? attachSignedUrls(att) : null,
                    },
                    duplicated: true,
                };
            }
        }
        throw error;
    }
}
