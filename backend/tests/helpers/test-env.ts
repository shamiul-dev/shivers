// MUST be the first import in any test file that touches the database —
// imports BEFORE any src/ module import. src/config/env.ts and src/db/index.ts
// read process.env synchronously at module evaluation, so the swap must happen
// before those modules load. Only src/ and node_modules imports — dotenv here
// is fine (it just populates process.env from backend/.env and never overrides
// variables that are already set).
import { config } from "dotenv";
config();

const DEV_URL = process.env.DATABASE_URL;
const TEST_URL = process.env.TEST_DATABASE_URL;

if (!TEST_URL) {
    throw new Error(
        "TEST_DATABASE_URL is missing. Add it to backend/.env (and to CI secrets later)."
    );
}

if (DEV_URL && new URL(DEV_URL).host === new URL(TEST_URL).host) {
    throw new Error(
        "DATABASE_URL and TEST_DATABASE_URL point at the same host. " +
            "Integration tests must never run against the dev database."
    );
}

// "test" enables any test-mode branches in app code (none yet) and marks logs.
process.env.NODE_ENV = "test";
// dotenv (loaded later by src/config/env.ts) never overrides variables that are
// already set, so this swap reliably wins over the .env DATABASE_URL.
process.env.DATABASE_URL = TEST_URL;
