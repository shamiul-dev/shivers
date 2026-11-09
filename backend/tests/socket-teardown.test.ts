// Same env contract as the other suites: swap DATABASE_URL to the dedicated
// test database BEFORE any src/ module loads. This file never queries the DB,
// but src/sockets reaches src/config/env.ts at module load, which requires
// DATABASE_URL (CI has no backend/.env to fall back on).
import "./helpers/test-env";

import { test } from "node:test";
import assert from "node:assert/strict";
import { Server as HttpServer } from "node:http";

import { createSocketServer, getIO } from "../src/sockets/index";
import { chatEvents } from "../src/services/chatEvents";

const GATEWAY_EVENTS = ["conversation:created", "conversation:member_joined"] as const;
type GatewayEvent = (typeof GATEWAY_EVENTS)[number];

interface ServerUnderTest {
    close(): Promise<void>;
}

function startServer(): ServerUnderTest {
    const server = new HttpServer();
    createSocketServer(server);
    server.listen(0);

    // Captured now: getIO() still points at the io createSocketServer just
    // installed. Closing through the captured io (rather than getIO() later)
    // matters with two servers alive at once.
    const io = getIO();
    assert.ok(io, "createSocketServer must install an io instance");

    return {
        close(): Promise<void> {
            return new Promise((resolve) => {
                // io.close() stops sockets AND closes the attached http server;
                // the http "close" event detaches this server's own chatEvents
                // listeners (the teardown behavior under test).
                io.close();
                server.close(() => resolve());
            });
        },
    };
}

async function settleEvents(): Promise<void> {
    await new Promise((res) => setTimeout(res, 50));
}

function assertListenerCounts(created: number, memberJoined: number, context: string): void {
    assert.equal(
        chatEvents.listenerCount("conversation:created"),
        created,
        `${context}: "conversation:created" listeners must equal ${created}`
    );
    assert.equal(
        chatEvents.listenerCount("conversation:member_joined"),
        memberJoined,
        `${context}: "conversation:member_joined" listeners must equal ${memberJoined}`
    );
}

test("socket gateway listener teardown", async (t) => {
    await t.test("single server: one listener per gateway event, zero after close", async () => {
        const server = startServer();
        assertListenerCounts(1, 1, "while server A is alive");
        await server.close();
        await settleEvents();
        assertListenerCounts(0, 0, "after server A closes (leak check)");
    });

    await t.test("two servers: additive listeners, each close removes only its own", async () => {
        const a = startServer();
        const b = startServer();
        assertListenerCounts(2, 2, "while servers A and B are alive");
        await a.close();
        await settleEvents();
        assertListenerCounts(1, 1, "after A closes — B keeps its own listeners");
        await b.close();
        await settleEvents();
        assertListenerCounts(0, 0, "after B closes");
    });
});
