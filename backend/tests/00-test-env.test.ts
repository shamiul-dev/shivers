// Guards the test-database wiring. If this fails, every other integration
// test is silently lying about which database it talks to — read carefully.
import "./helpers/test-env";
import { test } from "node:test";
import assert from "node:assert/strict";

import { env } from "../src/config/env";
import postgres from "postgres";

test("test environment is wired to the dedicated test database", async () => {
    // The swap helper (not .env alone) is what integration tests depend on.
    assert.equal(env.NODE_ENV, "test");
    assert.equal(env.DATABASE_URL, process.env.TEST_DATABASE_URL as string);

    const host = new URL(env.DATABASE_URL).host;
    assert.match(
        host,
        /ep-small-brook-aoqn2pg7/,
        "DATABASE_URL must be the dedicated test instance, not the dev database"
    );

    // Schema actually applied: migrations recorded and chat tables present.
    const sql = postgres(env.DATABASE_URL);
    try {
        const migrations = await sql.unsafe<{ count: number }>(
            "select count(*)::int as count from drizzle.__drizzle_migrations"
        );
        const count = migrations[0].count;
        assert.ok(count >= 5, `expected 5+ migrations applied, found ${count}`);

        const tables = await sql.unsafe<{ tablename: string }>(
            "select tablename from pg_tables where schemaname = 'public'"
        );
        const names = new Set(tables.map((r) => r.tablename));
        for (const required of [
            "user",
            "session",
            "account",
            "verification",
            "profiles",
            "conversations",
            "conversation_members",
            "messages",
            "attachments",
        ]) {
            assert.ok(names.has(required), `missing table: ${required}`);
        }
    } finally {
        await sql.end();
    }
});
