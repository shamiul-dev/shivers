import { pgTable, text, timestamp, boolean, primaryKey, index, unique, } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const profiles = pgTable("profiles", {
    userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
    username: text("username").notNull().unique(),
    bio: text("bio"),
    avatarKey: text("avatar_key"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => user.id, {
        onDelete: "cascade"
    }),
});

export const account = pgTable("account", {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => user.id, {
        onDelete: "cascade"
    }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

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