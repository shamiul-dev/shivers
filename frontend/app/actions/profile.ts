"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { serverFetch } from "@/lib/server-api";

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
  "undefined",
]);

const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Display name cannot be empty")
    .max(50, "Display name must be at most 50 characters")
    .optional(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(
      /^[a-z0-9_]+$/,
      "Username can only contain lowercase letters, numbers, and underscores"
    )
    .refine((val) => !RESERVED_USERNAMES.has(val), {
      message: "This username is reserved and cannot be chosen",
    }),
  bio: z
    .string()
    .trim()
    .max(160, "Bio cannot exceed 160 characters")
    .optional()
    .nullable(),
});

/**
 * Fetch the current authenticated user and their profile from the backend.
 * Returns null if unauthenticated or request fails.
 */
export async function getProfile() {
  try {
    const result = await serverFetch<{
      user: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
      };
      profile: {
        userId: string;
        username: string;
        bio?: string | null;
        avatarKey?: string | null;
        createdAt: string;
        updatedAt: string;
      } | null;
    }>("/api/profile/me");

    if (!result.ok || !result.data) {
      return null;
    }

    return result.data;
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "digest" in err) {
      throw err;
    }
    console.error("Error calling getProfile:", err);
    return null;
  }

}

/**
 * Server Action to create or update profile (username and bio) on onboarding.
 */
export async function updateProfileAction(formData: FormData) {
  const rawData = {
    username: (formData.get("username") as string) || "",
    bio: (formData.get("bio") as string) || undefined,
  };

  const validation = updateProfileSchema.safeParse(rawData);
  if (!validation.success) {
    const firstError = validation.error.issues[0]?.message || "Invalid input";
    redirect(`/onboarding?error=${encodeURIComponent(firstError)}`);
  }

  let success = false;
  let errorMessage: string | null = null;

  try {
    const result = await serverFetch<{
      error?: string;
      issues?: string[];
    }>("/api/profile/me", {
      method: "PATCH",
      body: JSON.stringify(validation.data),
    });

    if (!result.ok) {
      errorMessage =
        result.data?.error ||
        result.data?.issues?.[0] ||
        "Failed to update profile. Please try again.";
    } else {
      success = true;
    }
  } catch (err) {
    errorMessage = "Could not connect to the server.";
  }

  if (!success && errorMessage) {
    redirect(`/onboarding?error=${encodeURIComponent(errorMessage)}`);
  }

  // Gate transition: Once username is chosen, proceed directly to /chat
  redirect("/chat");
}

/**
 * Real-time username availability check (used by client components).
 */
export async function checkUsernameAction(username: string): Promise<{
  available: boolean;
  message?: string;
}> {
  const clean = username.trim().toLowerCase();
  if (clean.length < 3) {
    return { available: false, message: "Username must be at least 3 characters" };
  }
  if (!/^[a-z0-9_]+$/.test(clean)) {
    return {
      available: false,
      message: "Only lowercase letters, numbers, and underscores allowed",
    };
  }
  if (RESERVED_USERNAMES.has(clean)) {
    return { available: false, message: "This username is reserved" };
  }

  try {
    const result = await serverFetch<{
      available: boolean;
      message?: string;
    }>(`/api/profile/check-username?q=${encodeURIComponent(clean)}`);

    if (!result.ok || !result.data) {
      return { available: false, message: "Error checking username" };
    }

    return {
      available: !!result.data.available,
      message: result.data.message,
    };
  } catch {
    return { available: false, message: "Unable to verify username" };
  }
}

/**
 * Server Action to update user settings from /settings/profile.
 * Handles display name, handle, and bio updates.
 */
export async function updateProfileSettingsAction(formData: FormData) {
  const rawData = {
    name: (formData.get("name") as string) || undefined,
    username: (formData.get("username") as string) || "",
    bio: (formData.get("bio") as string) || undefined,
  };

  const validation = updateProfileSchema.safeParse(rawData);
  if (!validation.success) {
    const firstError = validation.error.issues[0]?.message || "Invalid input";
    redirect(`/settings/profile?error=${encodeURIComponent(firstError)}`);
  }

  let success = false;
  let errorMessage: string | null = null;

  try {
    const result = await serverFetch<{
      error?: string;
      issues?: string[];
    }>("/api/profile/me", {
      method: "PATCH",
      body: JSON.stringify(validation.data),
    });

    if (!result.ok) {
      errorMessage =
        result.data?.error ||
        result.data?.issues?.[0] ||
        "Failed to update profile. Please try again.";
    } else {
      success = true;
    }
  } catch (err) {
    errorMessage = "Could not connect to the server.";
  }

  if (!success && errorMessage) {
    redirect(`/settings/profile?error=${encodeURIComponent(errorMessage)}`);
  }

  redirect("/settings/profile?saved=true");
}

