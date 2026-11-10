import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { getProfile } from "@/app/actions/profile";
import { serverFetch } from "@/lib/server-api";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_SECURE_NAME } from "@/lib/auth-constants";
import { conversationsCache } from "@/hooks/conversations-cache";
import type { Conversation } from "@/types/chat";
import { ChatRail } from "@/components/chat/chat-rail";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { SocketManager } from "@/components/chat/socket-manager";
import { ChatShell } from "@/components/chat/chat-shell";

async function ChatNavigation() {
  await connection();
  const cookieStore = await cookies();
  const sessionToken =
    cookieStore.get(SESSION_COOKIE_NAME)?.value ||
    cookieStore.get(SESSION_COOKIE_SECURE_NAME)?.value;

  const profileData = await getProfile();

  if (!profileData?.user) {
    redirect("/login?expired=true");
  }

  if (!profileData.profile?.username) {
    redirect("/onboarding");
  }

  // Server-side initial list: hydrated straight into the TanStack cache
  const conversationsResult = await serverFetch<{ conversations: Conversation[] }>(
    "/api/conversations"
  );

  const queryClient = new QueryClient();
  queryClient.setQueryData(conversationsCache.key, {
    conversations: conversationsResult.data?.conversations ?? [],
  });
  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <SocketManager sessionToken={sessionToken} />
      <ChatRail user={profileData.user} profile={profileData.profile} />
      <ChatSidebar user={profileData.user} profile={profileData.profile} />
    </HydrationBoundary>
  );
}

function ChatNavigationSkeleton() {
  return (
    <div className="h-screen w-screen overflow-hidden flex bg-white text-foreground">
      {/* Rail Skeleton */}
      <div className="w-[68px] hidden md:flex flex-col items-center justify-between py-5 bg-white border-r border-slate-100 shrink-0 animate-pulse">
        <div className="w-10 h-10 rounded-xl bg-slate-200" />
        <div className="space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-100" />
          <div className="w-10 h-10 rounded-2xl bg-slate-100" />
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-200" />
      </div>

      {/* Sidebar Skeleton */}
      <div className="w-full md:w-[340px] lg:w-[360px] h-screen bg-white border-r border-slate-100 flex flex-col p-4 space-y-4 shrink-0 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-6 w-28 bg-slate-200 rounded" />
          <div className="h-8 w-14 bg-slate-100 rounded-xl" />
        </div>
        <div className="h-9 w-full bg-slate-100 rounded-xl" />
        <div className="flex space-x-2">
          <div className="h-6 w-12 bg-slate-200 rounded-full" />
          <div className="h-6 w-16 bg-slate-100 rounded-full" />
        </div>
        <div className="space-y-3 pt-3 flex-1">
          <div className="h-16 w-full bg-slate-50 rounded-2xl border border-slate-100" />
          <div className="h-16 w-full bg-slate-50 rounded-2xl border border-slate-100" />
        </div>
      </div>

      {/* Main Stage Skeleton for desktop */}
      <div className="hidden md:flex flex-1 h-screen bg-slate-50/50 items-center justify-center animate-pulse">
        <div className="w-12 h-12 rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<ChatNavigationSkeleton />}>
      <ChatShell navigation={<ChatNavigation />}>
        {children}
      </ChatShell>
    </Suspense>
  );
}
