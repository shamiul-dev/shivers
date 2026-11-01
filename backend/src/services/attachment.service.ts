import crypto from "node:crypto";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { attachments, conversationMembers } from "@/db/schema";
import { processAndStoreFile, getAttachmentDiskPath } from "@/services/storage.service";

export async function uploadAttachment(params: {
  conversationId: string;
  userId: string;
  buffer: Buffer;
  originalName: string;
  mimetype: string;
}) {
  const { conversationId, userId, buffer, originalName, mimetype } = params;

  // 1. Verify membership
  const [membership] = await db
    .select({ role: conversationMembers.role })
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, userId)
      )
    )
    .limit(1);

  if (!membership) {
    throw new Error("FORBIDDEN: You are not a member of this conversation");
  }

  // 2. Process and store file
  const stored = await processAndStoreFile(buffer, originalName, mimetype);

  // 3. Insert attachment record
  const id = crypto.randomUUID();
  const [attachment] = await db
    .insert(attachments)
    .values({
      id,
      conversationId,
      uploaderId: userId,
      storageKey: stored.storageKey,
      thumbKey: stored.thumbKey,
      fileName: originalName,
      mime: stored.mime,
      sizeBytes: stored.sizeBytes,
      width: stored.width ?? null,
      height: stored.height ?? null,
      status: "ready",
    })
    .returning();

  return attachment;
}

export async function linkAttachmentToMessage(attachmentId: string, messageId: string) {
  const [updated] = await db
    .update(attachments)
    .set({ messageId })
    .where(eq(attachments.id, attachmentId))
    .returning();

  return updated;
}

export async function getAttachmentForUser(attachmentId: string, userId: string) {
  const [attachment] = await db
    .select()
    .from(attachments)
    .where(eq(attachments.id, attachmentId))
    .limit(1);

  if (!attachment) {
    return null;
  }

  // Verify user is in conversation
  const [membership] = await db
    .select()
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, attachment.conversationId),
        eq(conversationMembers.userId, userId)
      )
    )
    .limit(1);

  if (!membership) {
    throw new Error("FORBIDDEN");
  }

  const filePath = getAttachmentDiskPath(attachment.storageKey);
  const thumbPath = attachment.thumbKey ? getAttachmentDiskPath(attachment.thumbKey, true) : null;

  return { attachment, filePath, thumbPath };
}

export async function getAttachmentDiskPathsById(attachmentId: string) {
  const [attachment] = await db
    .select()
    .from(attachments)
    .where(eq(attachments.id, attachmentId))
    .limit(1);

  if (!attachment) {
    return null;
  }

  const filePath = getAttachmentDiskPath(attachment.storageKey);
  const thumbPath = attachment.thumbKey ? getAttachmentDiskPath(attachment.thumbKey, true) : null;

  return { attachment, filePath, thumbPath };
}


