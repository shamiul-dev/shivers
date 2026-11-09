import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { env } from "@/config/env";
import * as schema from "@/db/schema";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema,
    }),
    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
    },
    // Cross-site sessions: the deployed frontend (*.vercel.app) and backend
    // (*.onrender.com) are different sites, so the default sameSite:"lax"
    // cookie is never attached to credentials-included requests. "none" +
    // secure keeps the session working across the split-domain deploy.
    // Local dev is unaffected: browsers treat localhost as trustworthy and
    // accept Secure cookies on http://localhost.
    advanced: {
        defaultCookieAttributes: { sameSite: "none", secure: true },
    },
    secret: env.BETTER_AUTH_SECRET,
    baseUrl: env.BETTER_AUTH_URL,
    trustedOrigins: [env.FRONTEND_URL],
});