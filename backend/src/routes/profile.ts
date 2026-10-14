import { Router, type Response } from "express";
import { z } from "zod";
import { eq, and, ne } from "drizzle-orm";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireAuth, type AuthenticatedRequest } from "@/middleware/requireAuth";


export const profileRouter = Router();

//Reserved usernames that cannot be claimed
const RESERVED_USERNAMES = new Set([
    "admin",
    "administrator",
    "system",
    "shivers",
    "support",
    "help",
    "root",
    "mod",
    "moderator",
    "api",
    "auth",
    "chat",
    "bot",
    "null",
    "undefined"
]);

//Validation schema for updating profiles
const updateProfileSchema = z.object({
    username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(
        /^[a-z0-9_]+$/,
        "Username can only contain lowercase letters, numbers and underscores"
    )
    .refine((val) => !RESERVED_USERNAMES.has(val.toLowerCase()), {
        message: "This username is reserved and cannot be chosen",
    }),
    bio: z.string().max(160, "Bio cannot exceed 160 characters").optional().nullable(),
});

// 1. Fetch current user's profile

profileRouter.get("/me", requireAuth, async (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;

    try{
        const [userProfile] = await db
            .select()
            .from(profiles)
            .where(eq(profiles.userId, authReq.user.id))
            .limit(1);

        res.status(200).json({
            user: {
                id: authReq.user.id,
                name: authReq.user.name,
                email: authReq.user.email,
                image: authReq.user.image,
            },
            profile: userProfile || null,
        });
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

// 2. Create or update profile

profileRouter.patch("/me", requireAuth, async (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            error: "Validation failed",
            issues: parsed.error.issues.map((issue) => issue.message),
        });
        return;
    }

    const { username, bio } = parsed.data;

    try {
        //Check if another user has already claimed this username
        const existing = await db
            .select({ id: profiles.userId })
            .from(profiles)
            .where(
                and(
                    eq(profiles.username, username),
                    ne(profiles.userId, authReq.user.id)
                )
            )
            .limit(1);

        if(existing.length > 0) {
            res.status(409).json({ error: "Username is already taken"});
            return;
        }

        // Upsert the profile (insert if first time, update if already exists)
        const [savedProfile] = await db
            .insert(profiles)
            .values({
                userId: authReq.user.id,
                username,
                bio: bio ?? null,
                updatedAt: new Date(),
            })
            .onConflictDoUpdate({
                target: profiles.userId,
                set: {
                    username,
                    bio: bio ?? null,
                    updatedAt: new Date(),
                },
            })
            .returning();
        
        res.status(200).json({
            message: "Profile updated successfully",
            profile: savedProfile,
        });
    } catch(error) {
        console.error("Error saving profile:", error);
        res.status(500).json({ error: "Failed to save profile" });
    }
});

// 3. Live availability check

profileRouter.get("/check-username", async (req, res: Response) => {
    const username = String(req.query.q || "").toLowerCase().trim();

    if(!username || username.length < 3 || username.length > 20) {
        res.status(200).json({
            available: false,
            reason: "Username must be 3-20 characters long",
        });
        return;
    }

    if(!/^[a-z0-9_]+$/.test(username)) {
        res.status(200).json({
            available: false,
            reason: "This username is reserved",
        });
        return;
    }
    try {
        const existing = await db
            .select({ id: profiles.userId })
            .from(profiles)
            .where(eq(profiles.username, username))
            .limit(1);
        
        res.status(200).json({
            available: existing.length === 0,
            reason: existing.length === 0 ? "Available" : "Already taken",
        });
    } catch (error) {
        res.status(500).json({ error: "Check failed "});
    }
});