// HTTP integration: authentication wiring.
// Proves the cookie/session boundary: public vs protected routes, the real
// Better Auth signup flow, profile claiming, and session invalidation.
import { test } from "node:test";
import assert from "node:assert/strict";

import { api, withCleanData } from "./helpers/http";
import { registerTestUser } from "./helpers/users";

await withCleanData();

test("GET /health is public", async () => {
    const res = await api.get("/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ok");
});

test("protected routes reject requests without a session cookie", async () => {
    const cases: [string, "get" | "post" | "patch", unknown][] = [
        ["/api/profile/me", "get", undefined],
        ["/api/users/search?q=ali", "get", undefined],
        ["/api/conversations", "get", undefined],
        ["/api/conversations", "post", { name: "Lounge" }],
        ["/api/conversations", "post", { userId: "3e5f-anything" }],
        ["/api/conversations/0c1e7-not-real/messages", "get", undefined],
    ];

    for (const [path, method, body] of cases) {
        const res = await (api as any)[method](path).send(body ?? {});
        assert.equal(res.status, 401, `${method.toUpperCase()} ${path} must reject anonymous`);
        assert.ok(res.body?.error, `expected an error body on ${path}`);
    }
});

test("a fabricated session cookie is still rejected", async () => {
    const res = await api
        .get("/api/profile/me")
        .set("Cookie", "better-auth.session_token=forged.token.value");
    assert.equal(res.status, 401);
});

test("real signup yields a working session and profile claim", async () => {
    const alice = await registerTestUser({ username: "alice_wire" });

    // Session cookie resolves the user on /me (user + profile data)
    const meRes = await alice.client.get("/api/profile/me");
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.user.id, alice.id);
    assert.equal(meRes.body.user.email, alice.email);

    // Onboarding PATCH created the profile row with the claimed username
    assert.equal(meRes.body.profile?.username, "alice_wire");
});

test("users/search requires onboarding and hides the searcher", async () => {
    const alice = await registerTestUser({ username: "searched_me" });
    const bob = await registerTestUser({ username: "searched_bob" });

    // Found by username when someone else searches
    const res = await alice.client.get("/api/users/search").query({ q: "searched_bob" });
    assert.equal(res.status, 200);
    assert.equal(res.body.users.length, 1);
    assert.equal(res.body.users[0].id, bob.id);

    // Self is never returned
    const selfRes = await alice.client.get("/api/users/search").query({ q: "searched_me" });
    assert.equal(selfRes.status, 200);
    assert.equal(selfRes.body.users.length, 0);

    // Short queries short-circuit to empty
    const tinyRes = await alice.client.get("/api/users/search").query({ q: "s" });
    assert.equal(tinyRes.status, 200);
    assert.deepEqual(tinyRes.body.users, []);
});

test("username claiming enforces conflict and reserved words", async () => {
    // Reserved name
    const carol = await registerTestUser({ username: "carol_rez" });
    const reservedRes = await carol.client
        .patch("/api/profile/me")
        .send({ username: "admin" });
    assert.equal(reservedRes.status, 400, "reserved usernames must be rejected");

    // Conflict with an already-claimed username
    const dave = await registerTestUser({ username: "dave_rez" });
    const conflictRes = await carol.client
        .patch("/api/profile/me")
        .send({ username: dave.username });
    assert.equal(conflictRes.status, 409, "duplicate username must 409");
});

test("sign-out invalidates the session", async () => {
    const eve = await registerTestUser({ username: "eve_rez" });

    // Sanity: works signed in
    const before = await eve.client.get("/api/profile/me");
    assert.equal(before.status, 200);

    const outRes = await eve.client.post("/api/auth/sign-out");
    assert.equal(outRes.status, 200);

    // Authenticated path after invalidation -> 401
    const after = await eve.client.get("/api/profile/me");
    assert.equal(after.status, 401);
});
