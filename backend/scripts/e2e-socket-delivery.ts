/**
 * E2E delivery proof — run manually, NEVER wired into the test suite.
 *
 *   npx tsx scripts/e2e-socket-delivery.ts                      (refuses without opt-in)
 *   E2E_ALLOW_DB=1 npx tsx scripts/e2e-socket-delivery.ts
 *
 * What it proves:
 *  - a REAL socket.io-client passes the handshake via the DB-fallback auth
 *    path (token -> session table -> user)
 *  - a service-layer chatEvents.emit("conversation:created") reaches the
 *    client AND the client's socket joins the conversation room
 *  - zero gateway listeners remain after the server closes (no leak)
 *
 * DB use: seeds a user + session row (ids prefixed __e2e_<random>), sweeps
 * prior __e2e_% rows first (self-heals a killed run), deletes in finally.
 */
import { eq, like } from "drizzle-orm";
import assert from "node:assert/strict";
import { Server as HttpServer } from "node:http";
import { io, type Socket } from "socket.io-client";

import { env } from "../src/config/env";
import { db } from "../src/db";
import { session as sessionTable, user as userTable } from "../src/db/schema";
import { createSocketServer, getIO } from "../src/sockets/index";
import { chatEvents } from "../src/services/chatEvents";

if (process.env.E2E_ALLOW_DB !== "1") {
    console.error("Refusing to run: this script writes to the database configured in backend/.env");
    console.error("Set E2E_ALLOW_DB=1 to opt in, after visually confirming the host below is a dev database.");
    process.exit(1);
}

const HOST = new URL(env.DATABASE_URL).host;
console.log(`TARGET DB HOST: ${HOST}`);
console.log("If this is not your dev database, kill this script now.");

const RANDOM = Math.random().toString(36).slice(2, 10);
const userId = `__e2e_user_${RANDOM}`;
const sessionId = `__e2e_session_${RANDOM}`;
// Handshake contract: DB stores the first segment; the client sends the full
// token-with-suffix (authToken.split(".")[0] === DB token)
const dbToken = `__e2e_token_${RANDOM}`;
const socketToken = `${dbToken}.sig`;
const conversationId = `__e2e_conv_${RANDOM}`;

// Escaped-LIKE sweep pattern (Postgres default escape char is "\"): matches
// exactly the two literal leading underscores we prefix with.
const SWEEP_PATTERN = "\\_\\_e2e\\_%";

async function connect(opts: {
    url: string;
    token: string;
    onCreated: (payload: { id: string }) => void;
}): Promise<Socket> {
    return new Promise((resolve, reject) => {
        const client = io(opts.url, {
            auth: { token: opts.token },
            transports: ["websocket"],
            reconnection: false,
            timeout: 10_000,
        });
        client.on("connect", () => resolve(client));
        client.on("connect_error", (err: Error) => reject(new Error(`handshake failed: ${err.message}`)));
        client.on("conversation:created", opts.onCreated);
    });
}

try {
    console.log("Sweeping prior __e2e_% rows (self-heal for killed runs)...");
    await db.delete(sessionTable).where(like(sessionTable.id, SWEEP_PATTERN)).execute();
    await db.delete(userTable).where(like(userTable.id, SWEEP_PATTERN)).execute();

    console.log(`Seeding e2e rows for user ${userId}...`);
    await db.insert(userTable).values({
        id: userId,
        name: "E2E Delivery Test",
        email: `__e2e_${RANDOM}@test.local`,
        emailVerified: false,
    }).execute();
    await db.insert(sessionTable).values({
        id: sessionId,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        token: dbToken,
        userId,
    }).execute();

    const httpServer = new HttpServer();
    createSocketServer(httpServer);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const port = (httpServer.address() as { port: number }).port;
    const server = getIO();
    assert.ok(server, "expected live io after createSocketServer");

    const createdPayloads: { id: string }[] = [];
    const client = await connect({
        url: `http://localhost:${port}`,
        token: socketToken,
        onCreated: (payload) => createdPayloads.push(payload),
    });
    console.log(`Client connected: ${client.id} (handshake ok via DB-fallback auth)`);

    chatEvents.emit("conversation:created", {
        conversation: { id: conversationId, type: "room", name: "e2e", dmKey: null, createdBy: userId, createdAt: new Date() },
        userIds: [userId],
    });

    // Settle window: emit -> relay -> client delivery are async
    await new Promise((res) => setTimeout(res, 500));

    assert.equal(createdPayloads.length, 1, "client must receive exactly one conversation:created");
    assert.equal(createdPayloads[0].id, conversationId, "payload conversation id must match");

    const inRoom = await server.in(conversationId).fetchSockets();
    assert.ok(
        inRoom.some((s) => s.id === client.id),
        "client socket must be a member of the conversation room (socketsJoin translation)"
    );
    assert.equal(chatEvents.listenerCount("conversation:created"), 1, "one live gateway listener while server up");

    // Teardown: io stops sockets/namespaces, http close detaches exactly our
    // listeners. Assert the close event actually fired (else the listener
    // detach guarantee is untested).
    const closedFired = new Promise<boolean>((resolve) => {
        httpServer.once("close", () => resolve(true));
    });
    client.close();
    server.close();
    if (httpServer.listening) {
        httpServer.close();
    }
    const didClose = await Promise.race([
        closedFired,
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 10_000)),
    ]);
    assert.equal(didClose, true, "http close event must fire within 10s");
    assert.equal(chatEvents.listenerCount("conversation:created"), 0, "leak check: zero gateway listeners after close");
    assert.equal(chatEvents.listenerCount("conversation:member_joined"), 0, "leak check: zero member_joined listeners after close");

    console.log("DELIVERY E2E OK — real client received event, joined conversation room, teardown left zero listeners.");
} catch (err: unknown) {
    console.error("E2E delivery FAILED:", err);
    process.exitCode = 1;
} finally {
    await db.delete(sessionTable).where(eq(sessionTable.id, sessionId)).execute();
    await db.delete(userTable).where(eq(userTable.id, userId)).execute();
    console.log("Seeded rows deleted.");
}

// socket.io-client keeps event-loop timers alive after close; exit explicitly
process.exit(process.exitCode === undefined ? 0 : process.exitCode);
