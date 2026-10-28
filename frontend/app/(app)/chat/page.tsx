import React, { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile } from "@/app/actions/profile";
import { ChatEmptyStage } from "@/components/chat/chat-empty-stage";
import ChatStageLoading from "./loading";

export const metadata: Metadata = {
  title: "Messages — Shivers",
  description: "Real-time chat, channels, and direct messaging on Shivers.",
};

async function ChatPageContent() {
  const profileData = await getProfile();

  if (!profileData?.user) {
    redirect("/login");
  }

  if (!profileData.profile?.username) {
    redirect("/onboarding");
  }

  return (
    <ChatEmptyStage
      user={profileData.user}
      profile={profileData.profile}
    />
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatStageLoading />}>
      <ChatPageContent />
    </Suspense>
  );
}
