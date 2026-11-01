import React, { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { getProfile } from "@/app/actions/profile";
import {
  fetchConversationDetailsAction,
  fetchMessagesAction,
} from "@/app/actions/chat";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatMessagesView } from "@/components/chat/chat-messages-view";
import ConversationLoading from "./loading";

interface ConversationPageProps {
  params: Promise<{
    conversationId: string;
  }>;
}

export async function generateMetadata({
  params,
}: ConversationPageProps): Promise<Metadata> {
  const { conversationId } = await params;
  const res = await fetchConversationDetailsAction(conversationId);
  if (!res.ok || !res.conversation) {
    return { title: "Conversation — Shivers" };
  }
  const title =
    res.conversation.type === "dm"
      ? res.conversation.otherUser?.name || "Direct Message"
      : res.conversation.name || "Channel";

  return {
    title: `${title} — Shivers`,
    description: `Real-time chat thread on Shivers.`,
  };
}

async function ConversationContent({
  conversationId,
}: {
  conversationId: string;
}) {
  const profileData = await getProfile();

  if (!profileData?.user) {
    redirect("/login?expired=true");
  }

  if (!profileData.profile?.username) {
    redirect("/onboarding");
  }

  // Parallel server fetch: conversation metadata + initial 50 messages
  const [detailsResult, messagesResult] = await Promise.all([
    fetchConversationDetailsAction(conversationId),
    fetchMessagesAction(conversationId, { limit: 50 }),
  ]);

  if (!detailsResult.ok || !detailsResult.conversation) {
    redirect("/chat");
  }

  const conversation = detailsResult.conversation;
  const initialMessages = messagesResult.data?.messages ?? [];

  const cookieStore = await cookies();
  const sessionToken =
    cookieStore.get("better-auth.session_token")?.value ||
    cookieStore.get("__Secure-better-auth.session_token")?.value;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <ChatHeader conversation={conversation} />
      <ChatMessagesView
        conversationId={conversationId}
        currentUserId={profileData.user.id}
        initialHistory={initialMessages}
        otherUser={conversation.otherUser}
        sessionToken={sessionToken}
      />
    </div>
  );
}

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  const { conversationId } = await params;

  return (
    <Suspense fallback={<ConversationLoading />}>
      <ConversationContent conversationId={conversationId} />
    </Suspense>
  );
}

