// HTTP integration: conversation membership enforcement.
// The plan's #1 rule — a non-member must NEVER be able to read or write a
// conversation, on any endpoint: details, history, members, read cursor.
import { test } from "node:test";
import assert from "node:assert/strict";

import { withCleanData } from "./helpers/http";
import { registerTestUser, type TestUser } from "./helpers/users";

await withCleanData();

interface DmContext {
    alice: TestUser;
    bob: TestUser;
    charlie: TestUser;
    dmId: string;
}

async function makeDm(): Promise<DmContext> {
    // No fixed usernames — each test registers fresh users; the file truncates
    // once at load, so fixed names would collide across tests in the same file.
    const alice = await registerTestUser();
    const bob = await registerTestUser();
    const charlie = await registerTestUser();

    const createRes = await alice.client
        .post("/api/conversations/dm")
        .send({ userId: bob.id });

    assert.equal(createRes.status, 201);
    return { alice, bob, charlie, dmId: createRes.body.conversation.id };
}

test("DM creation is idempotent per pair (dm_key)", async () => {
    const { alice, bob, dmId } = await makeDm();

    const second = await alice.client
        .post("/api/conversations/dm")
        .send({ userId: bob.id });
    assert.equal(second.status, 200, "second request for the same pair must reuse, not recreate");
    assert.equal(second.body.conversation.id, dmId);
});

test("DM cannot be created with yourself", async () => {
    const { alice } = await makeDm();
    const res = await alice.client
        .post("/api/conversations/dm")
        .send({ userId: alice.id });
    assert.equal(res.status, 400);
});

test("a non-member is locked out of every conversation endpoint", async () => {
    const { alice, charlie, dmId } = await makeDm();

    // Charlie knows the id (worst case: guessed/leaked) and has a valid session.
    const details = await charlie.client.get(`/api/conversations/${dmId}`);
    assert.equal(details.status, 404, "details must 404 for non-members");

    const history = await charlie.client.get(`/api/conversations/${dmId}/messages`);
    assert.equal(history.status, 404, "history must 404 for non-members");

    const members = await charlie.client.get(`/api/conversations/${dmId}/members`);
    assert.equal(members.status, 404, "membership list must 404 for non-members");

    const read = await charlie.client.post(`/api/conversations/${dmId}/read`);
    assert.equal(read.status, 404, "read cursor must 404 for non-members");

    // The 404 must not leak existence
    assert.equal(details.body.error, "Conversation not found");
});

test("a nonexistent conversation id behaves like no permission", async () => {
    const { alice } = await makeDm();
    const res = await alice.client.get("/api/conversations/00000000-0000-0000-0000-000000000000");
    assert.equal(res.status, 404);
});

test("both members can read the DM; membership list is complete", async () => {
    const { alice, bob, dmId } = await makeDm();

    for (const user of [alice, bob]) {
        const res = await user.client.get(`/api/conversations/${dmId}`);
        assert.equal(res.status, 200);
        assert.equal(res.body.conversation.id, dmId);
        assert.equal(res.body.conversation.type, "dm");
    }

    const membersRes = await alice.client.get(`/api/conversations/${dmId}/members`);
    assert.equal(membersRes.status, 200);
    const memberIds = membersRes.body.members.map((m: any) => m.userId).sort();
    assert.deepEqual(memberIds, [alice.id, bob.id].sort());
});

test("join requests target the right conversation", async () => {
    const { alice, charlie, dmId, bob } = await makeDm();
    void bob;

    // Rooms and DMs no longer use join-by-id on REST — adding a member to a DM is rejected
    const addCharlie = await alice.client
        .post(`/api/conversations/${dmId}/members`)
        .send({ userId: charlie.id });
    assert.equal(addCharlie.status, 400, "members cannot be force-added to a DM");
});

test("room member management enforces caller membership and conflicts", async () => {
    const alice = await registerTestUser({ username: "room_admin" });
    const bob = await registerTestUser({ username: "room_member" });
    const charlie = await registerTestUser({ username: "room_outsider" });

    const createRes = await alice.client
        .post("/api/conversations")
        .send({ name: "The Lounge" });
    assert.equal(createRes.status, 201);
    const roomId = createRes.body.conversation.id;
    assert.equal(createRes.body.conversation.type, "room");

    // Non-member cannot add members
    const outsiderAdd = await charlie.client
        .post(`/api/conversations/${roomId}/members`)
        .send({ userId: charlie.id });
    assert.equal(outsiderAdd.status, 403);

    // Owner adds bob -> 201
    const addBob = await alice.client
        .post(`/api/conversations/${roomId}/members`)
        .send({ userId: bob.id });
    assert.equal(addBob.status, 201);

    // Bob is now a member too: members listing works for him
    const membersRes = await bob.client.get(`/api/conversations/${roomId}/members`);
    assert.equal(membersRes.status, 200);
    assert.equal(membersRes.body.members.length, 2);

    // Duplicate add -> 409
    const duplicateAdd = await alice.client
        .post(`/api/conversations/${roomId}/members`)
        .send({ userId: bob.id });
    assert.equal(duplicateAdd.status, 409);

    // Charlie still can't see the room
    const peek = await charlie.client.get(`/api/conversations/${roomId}`);
    assert.equal(peek.status, 404);
});

test("conversation list is scoped to the caller's own conversations", async () => {
    const { alice, charlie, dmId } = await makeDm();

    const aliceList = await alice.client.get("/api/conversations");
    assert.equal(aliceList.status, 200);
    const aliceIds = aliceList.body.conversations.map((c: any) => c.id);
    assert.ok(aliceIds.includes(dmId));

    const charlieList = await charlie.client.get("/api/conversations");
    const charlieIds = charlieList.body.conversations.map((c: any) => c.id);
    assert.ok(!charlieIds.includes(dmId), "non-members must not see the conversation");
});
