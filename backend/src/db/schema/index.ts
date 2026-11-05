// Re-export the split schema modules. All existing "@/db/schema" imports
// keep working unchanged.
export * from "./auth";
export * from "./profiles";
export * from "./chat";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { account, session, user, verification } from "./auth";
import type { profiles } from "./profiles";
import type { attachments, conversationMembers, conversations, messages } from "./chat";

// Row types (SELECT shape) — the stable contract for services and future extraction.
export type UserRow = InferSelectModel<typeof user>;
export type UserInsert = InferInsertModel<typeof user>;
export type SessionRow = InferSelectModel<typeof session>;
export type AccountRow = InferSelectModel<typeof account>;
export type VerificationRow = InferSelectModel<typeof verification>;
export type ProfileRow = InferSelectModel<typeof profiles>;
export type ConversationRow = InferSelectModel<typeof conversations>;
export type ConversationInsert = InferInsertModel<typeof conversations>;
export type ConversationMemberRow = InferSelectModel<typeof conversationMembers>;
export type ConversationMemberInsert = InferInsertModel<typeof conversationMembers>;
export type MessageRow = InferSelectModel<typeof messages>;
export type MessageInsert = InferInsertModel<typeof messages>;
export type AttachmentRow = InferSelectModel<typeof attachments>;
export type AttachmentInsert = InferInsertModel<typeof attachments>;
