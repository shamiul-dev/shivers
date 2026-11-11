// HTTP integration: message reactions.
// Seeds a DM with one message per scenario; exercises the fixed reaction set:
// whitelist enforcement, idempotent add/remove, aggregation order,
// cross-conversation injection guard, and history-decorated reactions.
import { test } from "node:test";
import assert from "node:assert/strict";

import { withCleanData } from "./helpers/http";
import { registerTestUser, type TestUser } from "./helpers/users";
import { db } from "../src/db";
import { messages, conversations, conversationMembers } from "../src/db/schema";

await withCleanData();

interface ReactionContext {
    conversationId: string;
    messageId: string;
    alice: TestUser;
    bob: TestUser;
    outsider: TestUser;
}

async function seedReactionScenario(): Promise<ReactionContext> {
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

    const [message] = await db
        .insert(messages)
        .values({
            id: crypto.randomUUID(),
            conversationId: conversation.id,
            senderId: alice.id,
            type: "text",
            body: "reactable",
            clientId: `seed-${crypto.randomUUID()}`,
        })
        .returning();

    return { conversationId: conversation.id, messageId: message.id, alice, bob, outsider };
}

const reactionsUrl = (ctx: ReactionContext) =>
    `/api/conversations/${ctx.conversationId}/messages/${ctx.messageId}/reactions`;

test("member reacts; aggregation returns count and reactedByMe", async () => {
    const ctx = await seedReactionScenario();

    const res = await ctx.alice.client.post(reactionsUrl(ctx)).send({ emoji: "👍" });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.reactions, [{ emoji: "👍", count: 1, reactedByMe: true }]);

    // Second member joins in; for bob it's count 2, reactedByMe true
    const bobRes = await ctx.bob.client.post(reactionsUrl(ctx)).send({ emoji: "👍" });
    assert.equal(bobRes.status, 200);
    assert.deepEqual(bobRes.body.reactions, [{ emoji: "👍", count: 2, reactedByMe: true }]);
});

test("double-tap is idempotent (unique constraint, no error)", async () => {
    const ctx = await seedReactionScenario();

    const first = await ctx.alice.client.post(reactionsUrl(ctx)).send({ emoji: "❤️" });
    assert.equal(first.status, 200);

    const second = await ctx.alice.client.post(reactionsUrl(ctx)).send({ emoji: "❤️" });
    assert.equal(second.status, 200);
    assert.deepEqual(second.body.reactions, [{ emoji: "❤️", count: 1, reactedByMe: true }]);
});

test("emoji outside the fixed set is rejected with 400", async () => {
    const ctx = await seedReactionScenario();

    const res = await ctx.alice.client.post(reactionsUrl(ctx)).send({ emoji: "🐙" });
    assert.equal(res.status, 400);
});

test("history fetch decorates messages with reactions (integration)", async () => {
    const ctx = await seedReactionScenario();

    await ctx.alice.client.post(reactionsUrl(ctx)).send({ emoji: "👍" });
    await ctx.bob.client.post(reactionsUrl(ctx)).send({ emoji: "👍" });
    await ctx.bob.client.post(reactionsUrl(ctx)).send({ emoji: "🙏" });

    const page = await ctx.alice.client.get(`/api/conversations/${ctx.conversationId}/messages`);
    assert.equal(page.status, 200);

    const mine = page.body.messages.find((m: any) => m.id === ctx.messageId);
    assert.ok(mine, "seeded message must be on the page");
    assert.deepEqual(mine.reactions, [
        // alice (the fetcher) reacted 👍 herself → reactedByMe: true
        { emoji: "👍", count: 2, reactedByMe: true },
        { emoji: "🙏", count: 1, reactedByMe: false },
    ]);
});

test("non-member is conversation-404; cross-conversation message is message-404", async () => {
    const ctx = await seedReactionScenario();

    // Outsider to the DM: the membership gate answers 404 (not 403/200)
    const denied = await ctx.outsider.client.post(reactionsUrl(ctx)).send({ emoji: "👍" });
    assert.equal(denied.status, 404);

    // Message from ANOTHER conversation injected via the path conversation
    const [otherConv] = await db
        .insert(conversations)
        .values({
            id: crypto.randomUUID(),
            type: "room",
            name: "reaction-foreign",
            createdBy: ctx.alice.id,
        })
        .returning();
    await db.insert(conversationMembers).values([
        { conversationId: otherConv.id, userId: ctx.alice.id, role: "owner" },
    ]);
    const [foreignMessage] = await db
        .insert(messages)
        .values({
            id: crypto.randomUUID(),
            conversationId: otherConv.id,
            senderId: ctx.alice.id,
            type: "text",
            body: "foreign",
            clientId: `seed-${crypto.randomUUID()}`,
        })
        .returning();

    // alice IS a DM member, but the messageId belongs to another conversation
    const injected = await ctx.alice.client
        .post(`/api/conversations/${ctx.conversationId}/messages/${foreignMessage.id}/reactions`)
        .send({ emoji: "👍" });
    assert.equal(injected.status, 404);
});

test("removing a reaction deletes only own row; removing when absent stays 200", async () => {
    const ctx = await seedReactionScenario();

    await ctx.alice.client.post(reactionsUrl(ctx)).send({ emoji: "😢" });
    await ctx.bob.client.post(reactionsUrl(ctx)).send({ emoji: "😢" });

    const removed = await ctx.alice.client.delete(reactionsUrl(ctx)).send({ emoji: "😢" });
    assert.equal(removed.status, 200);
    assert.deepEqual(removed.body.reactions, [{ emoji: "😢", count: 1, reactedByMe: false }]);

    const again = await ctx.alice.client.delete(reactionsUrl(ctx)).send({ emoji: "😢" });
    assert.equal(again.status, 200);
    assert.deepEqual(again.body.reactions, [{ emoji: "😢", count: 1, reactedByMe: false }]);
});
