// Chat schema: conversations, members, messages, attachments.
// Table/group extraction from the former monolithic schema.ts — column
// definitions preserved verbatim so migrations stay byte-identical.
import { pgTable, text, timestamp, primaryKey, index, unique, integer } from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * Conversations (Rooms and 1:1 Direct Messages)
 */

export const conversations = pgTable("conversations", {
    id: text("id").primaryKey(),
    type: text("type").notNull(), // 'room' | 'dm'
    name: text("name"), // only for rooms
    // Enforce exactly ONE DM between users
    dmKey: text("dm_key").unique(),
    createdBy: text("created_by").references(() => user.id, {onDelete: "set null"}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Conversation Members (Join table between conversations & users)
 */

export const conversationMembers = pgTable(
    "conversation_members",
    {
        conversationId: text("conversation_id")
            .notNull()
            .references(() => conversations.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        role: text("role").notNull().default("member"), // 'Owner' | 'Admin' | 'Member'
        joinedAt: timestamp("joined_at").notNull().defaultNow(),
        lastReadMessageId: text("last_read_message_id").references(() => messages.id, { onDelete: "set null" }),
    },
    (table) => [
        // Composite Primary Key: a user can only be in a conversation once
        primaryKey({ columns: [table.conversationId, table.userId] }),
        // Serves "all conversations for user X" lookups (sidebar list)
        index("conversation_members_user_id_idx").on(table.userId),
    ]
);

/**
 * Messages
 */

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => user.id, { onDelete: "set null" }),
    type: text("type").notNull().default("text"), // 'text' | 'image'
    body: text("body").notNull(),
    clientId: text("client_id").notNull(), // Client-generated UUID for optimistic UI & deduplication
    createdAt: timestamp("created_at").notNull().defaultNow(),
    editedAt: timestamp("edited_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    // Fast cursor pagination index (fetching history before a message id)
    index("messages_conversation_id_idx").on(table.conversationId, table.id),
    // Deduplication constraint: prevents inserting duplicate messages on network retries
    unique("messages_conversation_client_id_unique").on(
      table.conversationId,
      table.clientId
    ),
  ]
);

/**
 * Attachments
 */
export const attachments = pgTable(
  "attachments",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id").references(() => messages.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    uploaderId: text("uploader_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    thumbKey: text("thumb_key"),
    fileName: text("file_name").notNull(),
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    status: text("status").notNull().default("ready"), // 'pending' | 'ready' | 'deleted'
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("attachments_message_id_idx").on(table.messageId),
    index("attachments_conversation_id_idx").on(table.conversationId),
  ]
);
