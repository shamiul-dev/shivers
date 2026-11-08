// Creates real users through the REAL auth flow: POST /api/auth/sign-up/email →
// capture the Set-Cookie session → PATCH /api/profile/me to claim a username
// (the same request the onboarding screen makes). No session inserts, no fakes.
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";

import { api, clientFor } from "./http";

export interface TestUser {
    id: string;
    email: string;
    password: string;
    name: string;
    username: string;
    /** Better Auth session cookie(s), ready for supertest's .set("Cookie", ...) */
    cookie: string;
    /** A supertest client pre-authenticated as this user */
    client: ApiClient;
}

let userSeq = 0;

export async function registerTestUser(
    opts: Partial<{
        name: string;
        username: string;
        email: string;
        /** Set false to skip the profile PATCH (user stays pre-onboarding, username null). */
        onboard: boolean;
    }> = {}
): Promise<TestUser> {
    userSeq += 1;
    const suffix = `${userSeq}-${randomBytes(3).toString("hex")}`.toLowerCase();
    const name = opts.name ?? `Test User ${suffix}`;
    // keep usernames unique across runs: 3-20 chars, [a-z0-9_]
    const username = opts.username ?? `t${suffix.replace(/-/g, "")}`;
    const email = opts.email ?? `test-${suffix}.${Date.now()}@shivers.test`;
    const password = opts.password ?? "correct-horse-battery-staple";

    const signupRes = await api
        .post("/api/auth/sign-up/email")
        .send({ name, email, password });

    assert.equal(
        signupRes.status,
        200,
        `sign-up should succeed, got: ${JSON.stringify(signupRes.body)}`
    );

    const cookieList = signupRes.headers["set-cookie"] ?? [];
    const cookie = cookieList.join("; ");
    if (!cookie) {
        throw new Error("sign-up response did not set a session cookie");
    }

    const userId = String(signupRes.body?.user?.id);
    if (!userId) throw new Error("sign-up response missing user.id");

    const client: ApiClient = clientFor(cookie);

    // The onboarding-equivalent username claim, unless explicitly skipped.
    if (opts.onboard !== false) {
        const profileRes = await client
            .patch("/api/profile/me")
            .send({ username, name });
        if (profileRes.status !== 200) {
            throw new Error(
                `profile PATCH should succeed, got: ${JSON.stringify(profileRes.body)}`
            );
        }
    }

    return { id: userId, email, password, name, username, cookie, client };
}
