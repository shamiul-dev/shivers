// HTTP integration: message history cursor pagination.
// Seeds a DM with 25 messages at controlled timestamps, then walks the
// ?before= (history) and ?after= (gap-fill/reconnect) windows.
import { test } from "node:test";
import assert from "node:assert/strict";

import { withCleanData } from "./helpers/http";
import { registerTestUser, type TestUser } from "./helpers/users";
import { db } from "../src/db";
import { messages, conversations, conversationMembers } from "../src/db/schema";

await withCleanData();

const TOTAL = 25;

interface PageContext {
    conversationId: string;
    /** message id by seed body, key "msg-00".."msg-24" */
    idsByBody: Map<string, string>;
    alice: TestUser; // member of the seeded DM
    bob: TestUser; // member of the seeded DM
}

async function seedPageableHistory(): Promise<PageContext> {
    // Auto-unique usernames — each test's seed registers fresh users.
    const alice = await registerTestUser();
    const bob = await registerTestUser();

    const [conversation] = await db
        .insert(conversations)
        .values({
            id: crypto.randomUUID(),
            type: "dm",
            dmKey: [alice.id, bob.id].sort().join(":"),
            createdBy: alice.id,
        })
        .returning();

    await db.insert(conversationMembers).values([
        { conversationId: conversation.id, userId: alice.id, role: "owner" },
        { conversationId: conversation.id, userId: bob.id, role: "owner" },
    ]);

    // Deterministic seed with strictly ascending created_at values. Message ids
    // are random UUIDs (NOT time-ordered), which is why the cursor must be the
    // (created_at, id) tuple per fetchHistory — the seed keeps ties out on purpose.
    const base = Date.now() - TOTAL * 60_000;
    const seedRows = Array.from({ length: TOTAL }, (_, i) => ({
        id: crypto.randomUUID(),
        conversationId: conversation.id,
        senderId: i % 2 === 0 ? alice.id : bob.id,
        type: "text",
        body: `msg-${String(i).padStart(2, "0")}`,
        clientId: `seed-${i}`,
        createdAt: new Date(base + i * 60_000),
    }));

    await db.insert(messages).values(seedRows);

    const idsByBody = new Map(seedRows.map((r) => [r.body, r.id]));
    return { conversationId: conversation.id, idsByBody, alice, bob };
}

test("default page: newest 20, chronological order, hasOlder=true", async () => {
    const { conversationId, alice } = await seedPageableHistory();

    const res = await alice.client.get(`/api/conversations/${conversationId}/messages`);
    assert.equal(res.status, 200);

    assert.equal(res.body.messages.length, 20);
    assert.equal(res.body.hasOlder, true);

    // Exactly the newest 20 seeds (msg-05 .. msg-24), chronological ASC
    const bodies = res.body.messages.map((m: any) => m.body);
    assert.deepEqual(
        bodies,
        Array.from({ length: 20 }, (_, i) => `msg-${String(i + 5).padStart(2, "0")}`)
    );

    const times = res.body.messages.map((m: any) => new Date(m.createdAt).getTime());
    for (let i = 1; i < times.length; i++) {
        assert.ok(times[i] > times[i - 1], "page must be strictly chronological");
    }
});

test("?before= walks back one page", async () => {
    const { conversationId, idsByBody, alice } = await seedPageableHistory();
    const cursor = idsByBody.get("msg-05") as string;

    const res = await alice.client
        .get(`/api/conversations/${conversationId}/messages`)
        .query({ before: cursor });
    assert.equal(res.status, 200);

    // Remaining 5 older messages, chronological ASC, no more pages
    assert.equal(res.body.messages.length, 5);
    assert.equal(res.body.hasOlder, false);
    assert.deepEqual(
        res.body.messages.map((m: any) => m.body),
        ["msg-00", "msg-01", "msg-02", "msg-03", "msg-04"]
    );
});

test("?after= gap-fill returns only newer messages in ascending order", async () => {
    const { conversationId, idsByBody, alice } = await seedPageableHistory();
    const cursor = idsByBody.get("msg-20") as string;

    const res = await alice.client
        .get(`/api/conversations/${conversationId}/messages`)
        .query({ after: cursor, limit: 50 });
    assert.equal(res.status, 200);

    const bodies = res.body.messages.map((m: any) => m.body);
    assert.deepEqual(bodies, ["msg-21", "msg-22", "msg-23", "msg-24"]);
});

test("unknown cursor or invalid params are handled cleanly", async () => {
    const { conversationId, alice } = await seedPageableHistory();

    const ghost = await alice.client
        .get(`/api/conversations/${conversationId}/messages`)
        .query({ before: "00000000-0000-0000-0000-000000000000" });
    assert.equal(ghost.status, 200);
    assert.deepEqual(ghost.body.messages, []);

    const bothCursors = await alice.client
        .get(`/api/conversations/${conversationId}/messages`)
        .query({
            before: "00000000-0000-0000-0000-000000000000",
            after: "00000000-0000-0000-0000-000000000000",
        });
    assert.equal(bothCursors.status, 400, "before and after together must 400");

    const tooBig = await alice.client
        .get(`/api/conversations/${conversationId}/messages`)
        .query({ limit: 99 });
    assert.equal(tooBig.status, 400, "limit above 50 must 400");

    const tooSmall = await alice.client
        .get(`/api/conversations/${conversationId}/messages`)
        .query({ limit: 0 });
    assert.equal(tooSmall.status, 400, "limit below 1 must 400");
});

test("other conversations' messages never leak into the page", async () => {
    const { conversationId, alice, bob } = await seedPageableHistory();

    // A second, unrelated conversation with one distinct message
    const roomOwner = await registerTestUser();
    const [otherConv] = await db
        .insert(conversations)
        .values({
            id: crypto.randomUUID(),
            type: "room",
            name: "leaky-room",
            createdBy: roomOwner.id,
        })
        .returning();
    await db.insert(conversationMembers).values([
        { conversationId: otherConv.id, userId: roomOwner.id, role: "owner" },
    ]);
    await db.insert(messages).values({
        id: crypto.randomUUID(),
        conversationId: otherConv.id,
        senderId: roomOwner.id,
        type: "text",
        body: "beta-only",
        clientId: "seed-beta",
    });

    // alice's page of the seeded DM contains only that DM's seeds
    const dmPage = await alice.client.get(`/api/conversations/${conversationId}/messages`);
    assert.equal(dmPage.status, 200);
    for (const m of dmPage.body.messages) {
        assert.match(m.body, /^msg-\d{2}$/, `unexpected message from another conversation: ${m.body}`);
    }

    // bob (outsider to leaky-room) cannot read the other conversation at all
    const denied = await bob.client.get(`/api/conversations/${otherConv.id}/messages`);
    assert.equal(denied.status, 404);

    // The room's member sees exactly its one message
    const roomPage = await roomOwner.client.get(`/api/conversations/${otherConv.id}/messages`);
    assert.equal(roomPage.status, 200);
    assert.deepEqual(roomPage.body.messages.map((m: any) => m.body), ["beta-only"]);
});
