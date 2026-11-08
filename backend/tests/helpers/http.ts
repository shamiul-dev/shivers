// Shared HTTP test client.
// Imports "./test-env" FIRST so the DATABASE_URL swap lands before any src/
// module is evaluated (env/db/auth are module-evaluation singletons). Then it
// wraps the real Express app with supertest and closes the shared postgres
// pool when the file's tests finish, so `node --test` exits cleanly.
//
// supertest note: request(app) is a TestAgent — it has the .get/.post verb
// factories but no .set(). Only Test requests carry .set/.send/.query, so a
// signed-in client is a thin verb wrapper that pre-sets the Cookie header on
// every request it builds.
import "./test-env";
import { after } from "node:test";

import supertest, { type Test } from "supertest";
import { app } from "../../src/app";
import { queryClient } from "../../src/db";
import { truncateAll } from "./db";

// One cast point: supertest's generic types get in the way of the wrapper.
const st = supertest as unknown as (app: unknown) => Test;

/** Talk to the app without a session. */
export const api = st(app);

/** A signed-in client. Every verb pre-sets the Better Auth session cookie. */
export interface ApiClient {
    get(url: string): Test;
    post(url: string): Test;
    patch(url: string): Test;
    delete(url: string): Test;
}

/** Build a client authenticated with the given Cookie header value. */
export function clientFor(cookie: string): ApiClient {
    return {
        get: (url) => st(app).get(url).set("Cookie", cookie),
        post: (url) => st(app).post(url).set("Cookie", cookie),
        patch: (url) => st(app).patch(url).set("Cookie", cookie),
        delete: (url) => st(app).delete(url).set("Cookie", cookie),
    };
}

after("close shared DB pool", async () => {
    await queryClient.end();
});

// NOTE: node:test silently skips top-level before(/after) hooks registered via
// helper-function wrappers (verified by repro), so per-file cleanup must be a
// top-level `await withCleanData();` in the test file itself — not a hook.
export { truncateAll };

export async function withCleanData(): Promise<void> {
    await truncateAll();
}
