"use client";

import React from "react";
import { usePathname } from "next/navigation";

interface ChatShellProps {
  navigation: React.ReactNode;
  children: React.ReactNode;
}

export function ChatShell({ navigation, children }: ChatShellProps) {
  const pathname = usePathname();
  const isThreadActive = pathname.startsWith("/chat/") && pathname !== "/chat";

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-surface text-foreground">
      {/* Sidebar / Navigation: on mobile, visible only when on /chat hub */}
      <div
        className={`h-full shrink-0 ${
          isThreadActive ? "hidden md:flex" : "flex w-full md:w-auto"
        }`}
      >
        {navigation}
      </div>

      {/* Active Conversation / Empty Stage: on mobile, visible only when inside a conversation */}
      <main
        className={`flex-1 h-full overflow-hidden ${
          isThreadActive ? "flex flex-col" : "hidden md:flex flex-col"
        }`}
      >
        {children}
      </main>
    </div>
  );
}

