// HTTP integration: message edit + soft delete.
// Ownership enforcement (403 for non-owner), editedAt marking, tombstone
// lifecycle (delete → 409 on edit → idempotent re-delete), and the
// conversation-membership gate on both mutations.
import { test } from "node:test";
import assert from "node:assert/strict";

import { withCleanData } from "./helpers/http";
import { registerTestUser, type TestUser } from "./helpers/users";
import { db } from "../src/db";
import { messages, conversations, conversationMembers } from "../src/db/schema";

await withCleanData();

interface EditContext {
    conversationId: string;
    aliceMessageId: string;
    bobMessageId: string;
    alice: TestUser;
    bob: TestUser;
    outsider: TestUser;
}

async function seedEditScenario(): Promise<EditContext> {
    const alice = await registerTestUser();
    const bob = await registerTestUser();
    const outsider = await registerTestUser();

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

    const [aliceMessage] = await db
        .insert(messages)
        .values({
            id: crypto.randomUUID(),
            conversationId: conversation.id,
            senderId: alice.id,
            type: "text",
            body: "alice original",
            clientId: `seed-${crypto.randomUUID()}`,
        })
        .returning();

    const [bobMessage] = await db
        .insert(messages)
        .values({
            id: crypto.randomUUID(),
            conversationId: conversation.id,
            senderId: bob.id,
            type: "text",
            body: "bob original",
            clientId: `seed-${crypto.randomUUID()}`,
        })
        .returning();

    return {
        conversationId: conversation.id,
        aliceMessageId: aliceMessage.id,
        bobMessageId: bobMessage.id,
        alice,
        bob,
        outsider,
    };
}

const messageUrl = (ctx: EditContext, messageId: string) =>
    `/api/conversations/${ctx.conversationId}/messages/${messageId}`;

test("owner edits message; editedAt set; other members see the edit on next fetch", async () => {
    const ctx = await seedEditScenario();

    const res = await ctx.alice.client.patch(messageUrl(ctx, ctx.aliceMessageId)).send({ body: "alice edited" });
    assert.equal(res.status, 200);
    assert.equal(res.body.message.body, "alice edited");
    assert.ok(res.body.message.editedAt, "editedAt must be set");

    const page = await ctx.bob.client.get(`/api/conversations/${ctx.conversationId}/messages`);
    const edited = page.body.messages.find((m: any) => m.id === ctx.aliceMessageId);
    assert.equal(edited.body, "alice edited");
    assert.ok(edited.editedAt, "editedAt must reach other members");
});

test("non-owner edit is 403 and leaves the body untouched", async () => {
    const ctx = await seedEditScenario();

    const res = await ctx.bob.client.patch(messageUrl(ctx, ctx.aliceMessageId)).send({ body: "hijacked" });
    assert.equal(res.status, 403);

    const page = await ctx.alice.client.get(`/api/conversations/${ctx.conversationId}/messages`);
    const untouched = page.body.messages.find((m: any) => m.id === ctx.aliceMessageId);
    assert.equal(untouched.body, "alice original");
    assert.equal(untouched.editedAt, null);
});

test("edit body validation: empty and oversized are 400", async () => {
    const ctx = await seedEditScenario();

    const empty = await ctx.alice.client.patch(messageUrl(ctx, ctx.aliceMessageId)).send({ body: "" });
    assert.equal(empty.status, 400);

    const oversized = await ctx.alice.client
        .patch(messageUrl(ctx, ctx.aliceMessageId))
        .send({ body: "x".repeat(4001) });
    assert.equal(oversized.status, 400);
});

test("owner deletes message: soft tombstone, media/history intact", async () => {
    const ctx = await seedEditScenario();

    const res = await ctx.alice.client.delete(messageUrl(ctx, ctx.aliceMessageId));
    assert.equal(res.status, 200);
    assert.ok(res.body.message.deletedAt, "deletedAt must be set");

    // Still present in history (soft delete) with deletedAt visible
    const page = await ctx.bob.client.get(`/api/conversations/${ctx.conversationId}/messages`);
    const tombstone = page.body.messages.find((m: any) => m.id === ctx.aliceMessageId);
    assert.ok(tombstone, "soft-deleted message stays in history");
    assert.ok(tombstone.deletedAt);
});

test("editing a tombstoned message is 409; re-delete is idempotent 200", async () => {
    const ctx = await seedEditScenario();

    await ctx.alice.client.delete(messageUrl(ctx, ctx.aliceMessageId));

    const editAfterDelete = await ctx.alice.client
        .patch(messageUrl(ctx, ctx.aliceMessageId))
        .send({ body: "zombie edit" });
    assert.equal(editAfterDelete.status, 409);

    const again = await ctx.alice.client.delete(messageUrl(ctx, ctx.aliceMessageId));
    assert.equal(again.status, 200);
});

test("non-owner delete is 403", async () => {
    const ctx = await seedEditScenario();

    const res = await ctx.bob.client.delete(messageUrl(ctx, ctx.aliceMessageId));
    assert.equal(res.status, 403);
});

test("outsider gets conversation-404 on both mutations", async () => {
    const ctx = await seedEditScenario();

    const patch = await ctx.outsider.client
        .patch(messageUrl(ctx, ctx.aliceMessageId))
        .send({ body: "sneaky" });
    assert.equal(patch.status, 404);

    const del = await ctx.outsider.client.delete(messageUrl(ctx, ctx.aliceMessageId));
    assert.equal(del.status, 404);
});
