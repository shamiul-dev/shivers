// Test-database cleanup: delete everything under auth + chat tables.
// Called at the start of each integration test file (see helpers/http.ts).
import { db } from "../../src/db";
import { sql } from "drizzle-orm";

export async function truncateAll(): Promise<void> {
    // Better Auth tables + chat tables (§5 of the plan). CASCADE absorbs FKs.
    await db.execute(sql.raw(
        `truncate table
            "user",
            session,
            account,
            verification,
            profiles,
            conversations,
            conversation_members,
            messages,
            attachments
        restart identity cascade`
    ));
}
