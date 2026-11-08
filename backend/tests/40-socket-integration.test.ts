// Socket.IO integration: handshake auth, message send + broadcast scoping,
// dedupe, join/read gates, typing flow, rate limit, and presence lifecycle.
//
// File design notes:
// - ONE socket server per file (src/sockets/io.ts keeps an io singleton —
//   see tests/socket-teardown.test.ts for what two live servers cost).
// - Clients connect AFTER the conversation exists so connection-time
//   auto-join puts them in the room, exactly like the real client flow.
// - node:test top-level after(/before) hooks are silently skipped under the
//   tsx loader (verified repro), so teardown is an explicitly-declared FINAL
//   test and --test-force-exit handles the lingering postgres pool.
// - The rate-limit check runs before any DB await, so N same-instant emits
//   on one connection consume tokens in order — the burst test relies on it.
import { Server as HttpServer } from "node:http";
import { once } from "node:events";
import { test } from "node:test";
import assert from "node:assert/strict";

import { io as ioc, type Socket as ClientSocket } from "socket.io-client";

import { truncateAll } from "./helpers/http";
import { registerTestUser, type TestUser } from "./helpers/users";
import { createSocketServer } from "../src/sockets/index";
import { createSocketRateLimit } from "../src/sockets/socketRateLimit";
import { chatEvents } from "../src/services/chatEvents";
import { db, queryClient } from "../src/db";
import { messages } from "../src/db/schema";
import { eq, and, count } from "drizzle-orm";
import { createOrGetDm } from "../src/services/conversation.service";

//////////////////////////////////////////////////////////////////////////////
// Shared setup — evaluated at module load, before any test runs.

await truncateAll();

const START_TIMEOUT = 8000;
const DB_TIMEOUT = 15000;
const SILENCE_MS = 700; // window in which "no leak" is positively proven

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
        p.then(
            (v) => { clearTimeout(timer); resolve(v); },
            (err) => { clearTimeout(timer); reject(err); }
        );
    });
}

function settle(ms: number): Promise<"settled"> {
    return new Promise((resolve) => setTimeout(() => resolve("settled"), ms));
}

/** Resolves if `event` never arrives on `socket` within ms; rejects if it does. */
function assertNoEvent(socket: ClientSocket, event: string, label: string, ms = SILENCE_MS): Promise<void> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off(event, onEvent);
            resolve();
        }, ms);
        const onEvent = (payload: unknown) => {
            clearTimeout(timer);
            reject(new Error(`${label} unexpectedly received "${event}": ${JSON.stringify(payload)}`));
        };
        socket.once(event, onEvent);
    });
}

// --- one live server for the whole file ---
const httpServer = new HttpServer();
const io = createSocketServer(httpServer);
httpServer.listen(0);
await once(httpServer, "listening");
const serverUrl = `http://127.0.0.1:${((httpServer.address() as any) as { port: number }).port}`;

// --- seed users (no profiles needed for sockets) + one DM alice<->bob ---
const alice: TestUser = await registerTestUser({ onboard: false });
const bob: TestUser = await registerTestUser({ onboard: false });
const charlie: TestUser = await registerTestUser({ onboard: false });

const dmResult = await createOrGetDm(alice.id, bob.id);
if (!dmResult) throw new Error("seed: DM creation failed");
const dmId: string = dmResult.conversation.id;

// --- signed-in chat clients (match frontend/lib/socket.ts options) ---
function connectSocket(user: TestUser): ClientSocket {
    return ioc(serverUrl, {
        transports: ["websocket"],
        extraHeaders: { Cookie: user.cookie },
        reconnection: false,
        timeout: START_TIMEOUT,
    });
}

function connectWithRawCookie(cookie: string): ClientSocket {
    return ioc(serverUrl, { transports: ["websocket"], extraHeaders: { Cookie: cookie }, reconnection: false, timeout: START_TIMEOUT });
}

function waitEvent<T = any>(socket: ClientSocket, event: string, ms = DB_TIMEOUT): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`event "${event}" not received within ${ms}ms`)), ms);
        socket.once(event, (payload: T) => { clearTimeout(timer); resolve(payload); });
    });
}

function emitAck<T = any>(socket: ClientSocket, event: string, payload: unknown, ms = DB_TIMEOUT): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`ack for "${event}" not received within ${ms}ms`)), ms);
        socket.emit(event, payload, (result: T) => { clearTimeout(timer); resolve(result); });
    });
}

async function connectUser(user: TestUser): Promise<ClientSocket> {
    const socket = connectSocket(user);
    await withTimeout(
        new Promise<void>((resolve, reject) => {
            socket.once("connect", resolve);
            socket.once("connect_error", (err) => reject(new Error(`connect(${user.username}): ${err.message ?? String(err)}`)));
        }),
        START_TIMEOUT,
        `connect ${user.username}`
    );
    return socket;
}

//////////////////////////////////////////////////////////////////////////////
// 1. Handshake authentication

test("handshake rejects an anonymous client", async () => {
    const socket = ioc(serverUrl, { transports: ["websocket"], reconnection: false, timeout: START_TIMEOUT });
    await withTimeout(
        new Promise<void>((resolve, reject) => {
            socket.once("connect_error", (err) => {
                assert.equal(String(err.message), "unauthorized");
                resolve();
            });
            socket.once("connect", () => reject(new Error("anonymous client must not connect")));
        }),
        START_TIMEOUT,
        "unauthenticated handshake error"
    );
    socket.disconnect();
});

test("handshake rejects a forged session cookie", async () => {
    const forged = connectWithRawCookie("better-auth.session_token=forged.value");
    await withTimeout(
        new Promise<void>((resolve, reject) => {
            forged.once("connect_error", (err) => {
                assert.equal(String(err.message), "unauthorized");
                resolve();
            });
            forged.once("connect", () => reject(new Error("forged cookie must not connect")));
        }),
        START_TIMEOUT,
        "forged-cookie handshake error"
    );
    forged.disconnect();
});

//////////////////////////////////////////////////////////////////////////////
// 2. Authenticated connections (used by every later test)

let aliceSocket!: ClientSocket;
let bobSocket!: ClientSocket;
let charlieSocket!: ClientSocket;

test("valid session cookies connect; later tests reuse these sockets", async () => {
    aliceSocket = await connectUser(alice);
    bobSocket = await connectUser(bob);
    charlieSocket = await connectUser(charlie);
    assert.ok(aliceSocket.connected && bobSocket.connected && charlieSocket.connected);
});

//////////////////////////////////////////////////////////////////////////////
// 3. message:send — ack, persistence, broadcast scoping

test("message:send acks, persists, and broadcasts only to the conversation", async () => {
    const bobGot = waitEvent(bobSocket, "message:new");
    const charlieSilence = assertNoEvent(charlieSocket, "message:new", "non-member");

    const ack = await emitAck<any>(aliceSocket, "message:send", {
        conversationId: dmId,
        clientId: "itest-cl-1",
        body: "hello bob",
    });

    assert.equal(ack.ok, true, `ack should succeed: ${JSON.stringify(ack)}`);
    assert.equal(ack.duplicated, false);
    assert.equal(ack.message.body, "hello bob");
    assert.equal(ack.message.senderId, alice.id);

    // Recipient sees the exact same message
    const bobPayload = await bobGot;
    assert.equal(bobPayload.id, ack.message.id);
    assert.equal(bobPayload.body, "hello bob");

    // Persisted correctly
    const [row] = await db.select().from(messages).where(eq(messages.id, ack.message.id));
    assert.ok(row, "message must be persisted");
    assert.equal(row.conversationId, dmId);
    assert.equal(row.clientId, "itest-cl-1");

    // Positive proof of no leak: nothing reached charlie in the window
    await charlieSilence;
});

//////////////////////////////////////////////////////////////////////////////
// 4. Dedupe by clientId (optimistic-UI retry contract)

test("same clientId re-send returns duplicated:true without a second row", async () => {
    const ack = await emitAck<any>(bobSocket, "message:send", {
        conversationId: dmId,
        clientId: "itest-cl-1",
        body: "hello bob (retry)",
    });
    assert.equal(ack.ok, true, `ack should succeed: ${JSON.stringify(ack)}`);
    assert.equal(ack.duplicated, true, "duplicate clientId must be flagged");
    assert.equal(ack.message.body, "hello bob", "the ORIGINAL message must be returned");

    const [rowCount] = await db
        .select({ n: count() })
        .from(messages)
        .where(and(eq(messages.conversationId, dmId), eq(messages.clientId, "itest-cl-1")));
    assert.equal(Number(rowCount.n), 1, "exactly one row may exist for the clientId");
});

//////////////////////////////////////////////////////////////////////////////
// 5. Membership gates on the socket layer

test("non-member message:send is refused with not_found", async () => {
    const ack = await emitAck<any>(charlieSocket, "message:send", {
        conversationId: dmId,
        clientId: "itest-charlie-1",
        body: "let me in",
    });
    assert.equal(ack.error, "not_found");

    const [rowCount] = await db
        .select({ n: count() })
        .from(messages)
        .where(eq(messages.clientId, "itest-charlie-1"));
    assert.equal(Number(rowCount.n), 0, "refused message must not persist");
});

test("conversation:join gates membership", async () => {
    const outsider = await emitAck<any>(charlieSocket, "conversation:join", { conversationId: dmId });
    assert.equal(outsider.error, "not_found");

    const member = await emitAck<any>(bobSocket, "conversation:join", { conversationId: dmId });
    assert.equal(member.ok, true);
});

test("conversation:read gates membership and sets the read cursor", async () => {
    const outsider = await emitAck<any>(charlieSocket, "conversation:read", { conversationId: dmId });
    assert.equal(outsider.error, "not_found");

    const res = await emitAck<any>(bobSocket, "conversation:read", { conversationId: dmId });
    assert.equal(res.ok, true);
    assert.ok(typeof res.lastReadMessageId === "string" && res.lastReadMessageId.length > 0,
        "the cursor must point at a message id");
});

//////////////////////////////////////////////////////////////////////////////
// 6. Typing indicators

test("typing flows member-to-member and never to non-members", async () => {
    const bobGot = waitEvent(bobSocket, "typing:start");
    const charlieSilence = assertNoEvent(charlieSocket, "typing:start", "non-member");

    aliceSocket.emit("typing:start", { conversationId: dmId });

    const payload = await bobGot;
    assert.equal(payload.conversationId, dmId);
    assert.equal(payload.userId, alice.id);

    await charlieSilence;

    const stopped = waitEvent(bobSocket, "typing:stop");
    aliceSocket.emit("typing:stop", { conversationId: dmId });
    const stopPayload = await stopped;
    assert.equal(stopPayload.conversationId, dmId);
    assert.equal(stopPayload.userId, alice.id);
});

//////////////////////////////////////////////////////////////////////////////
// 7. Per-socket rate limit (config: message:send max 10 / 5s)

test("rate limit blocks the same-instant burst beyond token capacity", async () => {
    // All 15 emits queue on ONE connection: the limiter's pre-DB check runs
    // for every event before/interleaved-with the slow DB writes, so the
    // first 10 consume the bucket and the rest must be refused.
    const burst = await Promise.all(
        Array.from({ length: 15 }, (_, i) =>
            emitAck<any>(bobSocket, "message:send", {
                conversationId: dmId,
                clientId: `itest-burst-${i}`,
                body: `burst-${i}`,
            }).then((ack) => ({ ack, clientId: `itest-burst-${i}` }))
        )
    );

    const okSends = burst.filter((b) => b.ack.ok);
    const blocked = burst.filter((b) => b.ack.error === "rate_limited");

    assert.ok(blocked.length >= 1, `burst must hit the rate limiter (blocked=${blocked.length})`);
    assert.ok(okSends.length >= 10, `no more than token refill may allow extra sends (ok=${okSends.length})`);
    assert.equal(blocked[0].ack.message, "Slow down");

    // Every accepted send must persist exactly once (no phantom successes)
    const seededBursts = await db
        .select({ n: count() })
        .from(messages)
        .where(and(eq(messages.conversationId, dmId), eq(messages.clientId, "itest-burst-0")));
    assert.equal(Number(seededBursts[0].n), 1, "burst-0 accepted once must equal its success");
});

//////////////////////////////////////////////////////////////////////////////
// 8. Rate limiter unit behavior (no DB involved)

test("createSocketRateLimit unit: buckets, refill, and clear()", async () => {
    const limiter = createSocketRateLimit({ evt: { max: 2, windowMs: 250 } });
    assert.equal(limiter.check("s1", "evt"), true);
    assert.equal(limiter.check("s1", "evt"), true);
    assert.equal(limiter.check("s1", "evt"), false, "third immediate call must be blocked");
    assert.equal(limiter.check("s2", "evt"), true, "other sockets keep their own bucket");

    await new Promise((r) => setTimeout(r, 270));
    assert.equal(limiter.check("s1", "evt"), true, "token must refill within windowMs");

    limiter.clear("s1");
    assert.equal(limiter.check("s1", "evt"), true, "clear() resets the bucket");
    assert.equal(limiter.check("s1", "evt"), true, "clear() restores full capacity");
    assert.equal(limiter.check("s1", "evt"), false, "capacity is still max=2");
});

//////////////////////////////////////////////////////////////////////////////
// 9. Presence lifecycle

test("presence:update fires offline on the last socket disconnect", async () => {
    const offline = await withTimeout(
        new Promise<any>((resolve) => {
            bobSocket.once("presence:update", (payload) => resolve(payload));
            charlieSocket.disconnect(); // charlie's only socket -> last connection
        }),
        DB_TIMEOUT,
        "charlie offline transition"
    );
    assert.equal(offline.userId, charlie.id);
    assert.equal(offline.status, "offline");
});

test("presence:query reflects the online set", async () => {
    const res = await emitAck<{ onlineUserIds: string[] }>(
        bobSocket, "presence:query", { userIds: [alice.id, charlie.id] }
    );
    assert.ok(res.onlineUserIds.includes(alice.id), "alice still online");
    assert.ok(!res.onlineUserIds.includes(charlie.id), "charlie disconnected earlier");
});

//////////////////////////////////////////////////////////////////////////////
// 10. Final teardown — declared LAST so it runs after everything above.

test("teardown: sockets, server, chatEvents listeners, DB pool", async () => {
    aliceSocket.disconnect();
    bobSocket.disconnect();
    charlieSocket.disconnect(); // already disconnected; no-op

    // io.close() closes sockets AND the http server; this file's chatEvents
    // gateway listeners must detach (same leak contract as
    // tests/socket-teardown.test.ts).
    io.close();
    await once(httpServer, "close");

    assert.equal(chatEvents.listenerCount("conversation:created"), 0, "gateway listener detached on close");
    assert.equal(chatEvents.listenerCount("conversation:member_joined"), 0, "gateway listener detached on close");

    await queryClient.end();
});
