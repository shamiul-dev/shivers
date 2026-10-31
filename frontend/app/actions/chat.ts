"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { serverFetch } from "@/lib/server-api";
import type { Conversation, Message } from "@/types/chat";

type BackendEnvelope = {
  conversation?: Conversation;
  error?: string;
  message?: string;
};

const createRoomSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Room name is required")
    .max(50, "Room name must be at most 50 characters"),
});

/**
 * Value-returning action (checkUsernameAction precedent).
 * Loads the caller's conversations for the hydrated sidebar.
 */
export async function fetchConversationsAction(): Promise<{ conversations: Conversation[] }> {
  const result = await serverFetch<{ conversations: Conversation[] }>("/api/conversations");
  if (!result.ok || !result.data) {
    return { conversations: [] };
  }
  return result.data;
}

/**
 * Value-returning action. Used by socket reconnect re-sync (useMessages).
 */
export async function fetchMessagesAction(
  conversationId: string,
  opts?: { before?: string; after?: string; limit?: number }
): Promise<{ ok: boolean; data: { messages: Message[]; hasOlder: boolean } | null }> {
  const params = new URLSearchParams();
  params.set("limit", String(Math.min(Math.max(opts?.limit ?? 20, 1), 50)));
  if (opts?.before) params.set("before", opts.before);
  if (opts?.after) params.set("after", opts.after);

  const result = await serverFetch<{
    messages: Message[];
    hasOlder: boolean;
  }>(`/api/conversations/${encodeURIComponent(conversationId)}/messages?${params.toString()}`);

  if (!result.ok || !result.data) {
    return { ok: false, data: null };
  }
  return { ok: true, data: result.data };
}

/**
 * House-pattern action: creates a room and redirects into it.
 */
export async function createRoomAction(formData: FormData) {
  const validation = createRoomSchema.safeParse({
    name: (formData.get("name") as string) || "",
  });

  if (!validation.success) {
    const firstError = validation.error.issues[0]?.message || "Invalid input";
    redirect(`/chat?error=${encodeURIComponent(firstError)}`);
  }

  const result = await serverFetch<BackendEnvelope>("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ name: validation.data.name }),
  });

  if (!result.ok || !result.data?.conversation) {
    const message =
      result.data?.error ||
      result.data?.message ||
      "Failed to create room. Please try again.";
    redirect(`/chat?error=${encodeURIComponent(message)}`);
  }

  redirect(`/chat/${result.data.conversation.id}`);
}

/**
 * Value-returning variant for the New chat dialog (needs live feedback).
 */
export async function startDmAction(targetUserId: string): Promise<
  { ok: true; conversationId: string } | { ok: false; error: string }
> {
  const clean = typeof targetUserId === "string" ? targetUserId.trim() : "";

  if (!clean) {
    return { ok: false, error: "Invalid target user" };
  }

  const result = await serverFetch<BackendEnvelope>("/api/conversations/dm", {
    method: "POST",
    body: JSON.stringify({ userId: clean }),
  });

  if (!result.ok) {
    return {
      ok: false,
      error:
        result.data?.error ||
        result.data?.message ||
        "Failed to start conversation. Please try again.",
    };
  }

  if (!result.data?.conversation) {
    return { ok: false, error: "Failed to start conversation. Please try again." };
  }

  return { ok: true, conversationId: result.data.conversation.id };
}

/**
 * House-pattern wrapper over startDmAction for form-style callers.
 */
export async function createDmAction(formData: FormData) {
  const targetUserId = (formData.get("userId") as string) || "";

  const result = await startDmAction(targetUserId);

  if (!result.ok) {
    redirect(`/chat?error=${encodeURIComponent(result.error)}`);
  }

  redirect(`/chat/${result.conversationId}`);
}
