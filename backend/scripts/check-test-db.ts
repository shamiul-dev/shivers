// One-off connectivity check for the test database (safe to delete).
import { config } from "dotenv";
config();

import postgres from "postgres";

const sql = postgres(process.env.TEST_DATABASE_URL!);
const version = await sql.unsafe<{ v: string }>("select version() as v");
console.log("SERVER:", version[0].v);

const tables = await sql.unsafe<{ tablename: string }>(
    "select tablename from pg_tables where schemaname = 'public' order by 1"
);
console.log("TABLES:", tables.map((r) => r.tablename).join(", "));

const applied = await sql.unsafe<{ n: number }>(
    "select count(*)::int as n from drizzle.__drizzle_migrations"
);
console.log("MIGRATIONS APPLIED:", applied[0].n);

await sql.end();
