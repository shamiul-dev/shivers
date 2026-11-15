import { response, Router, type Response } from "express";
import { eq, and, ne, or, ilike, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { user, profiles } from "@/db/schema"
import { logger } from "@/config/logger";
import { requireAuth, type AuthenticatedRequest } from "@/middleware/requireAuth";
import { id } from "zod/locales";

export const usersRouter = Router();

/**
 * 1. GET /api/users/search?q=
 * Search for users by username or display name.
 */

usersRouter.get("/search", requireAuth, async (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const rawQuery = String(req.query.q || "").trim();

    // If query is empty or less than 2 chars, return empty array immediately
    if (!rawQuery || rawQuery.length < 2) {
        res.status(200).json({ users: [] });
        return;
    }

    // Strip leading '@' if user searched with '@username'

    const cleanQuery = rawQuery.startsWith('@') ? rawQuery.slice(1) : rawQuery;
    const searchPattern = `%${cleanQuery}%`;

    try {
        const results = await db
        .select({
            id: user.id,
            name: user.name,
            image: user.image,
            username: profiles.username,
            bio: profiles.bio,
            avatarKey: profiles.avatarKey,
        })
        .from(profiles)
        .innerJoin(user, eq(profiles.userId, user.id))
        .where(
            and(
                // Must not be the searching user
                ne(user.id, authReq.user.id),
                // User must have completed onboarding
                isNotNull(profiles.username),
                // Matches either display name or username (case insensitive)
                or(
                    ilike(profiles.username, searchPattern),
                    ilike(user.name, searchPattern)
                )
            )
        )
        .limit(20);

        res.status(200).json({ users: results});
    } catch (error) {
        logger.error({ err: error }, "Error searching users");
        res.status(500).json({ error: "Failed to search users"});
    }
});

/**
 * 2. GET /api/users/:username
 * Fetch public profile card for a given handle.
 */

usersRouter.get("/:username", requireAuth, async (req, res: Response) => {
    const targetUsername = String(req.params.username || "").trim().toLowerCase();

    if(!targetUsername) {
        res.status(400).json({ error: "Username parameter is required"});
        return;
    }

    try {
        const [foundUser] = await db
        .select({
            id: user.id,
            name: user.name,
            image: user.image,
            username: profiles.username,
            bio: profiles.bio,
            avatarKey: profiles.avatarKey,
            createdAt: user.createdAt,
        })
        .from(profiles)
        .innerJoin(user, eq(profiles.userId, user.id))
        .where(eq(profiles.username, targetUsername))
        .limit(1);

        if(!foundUser) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.status(200).json({ user: foundUser });
    } catch (error) {
        logger.error({ err: error }, "Error fetching user profile");
        res.status(500).json({ error: "Failed to fetch user profile" });
    }
});