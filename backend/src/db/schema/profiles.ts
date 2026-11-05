// User-facing profile data (1:1 with the better-auth user table)
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const profiles = pgTable("profiles", {
    userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
    username: text("username").notNull().unique(),
    bio: text("bio"),
    avatarKey: text("avatar_key"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
