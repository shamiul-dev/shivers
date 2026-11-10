import React from "react";
import Image from "next/image";

import { NewChatDialog } from "@/components/chat/new-chat-dialog";
import { SidebarConversationList } from "@/components/chat/sidebar-conversation-list";
import { UserMenuDropdown } from "@/components/chat/user-menu-dropdown";

interface ChatSidebarProps {
  user: {
    name: string;
    image?: string | null;
  };
  profile: {
    username: string;
  } | null;
}

export function ChatSidebar({ user, profile }: ChatSidebarProps) {
  return (
    <aside className="w-full md:w-[340px] lg:w-[360px] h-screen bg-white border-r border-slate-200/80 flex flex-col shrink-0 select-none">
      {/* Mobile-only header bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-background">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-1.5 shadow-xs">
            <Image
              src="/shivers-symbol.svg"
              alt="Shivers"
              width={18}
              height={18}
              className="invert"
            />
          </div>
          <span className="font-bold text-base text-foreground">Shivers</span>
        </div>

        <UserMenuDropdown
          user={user}
          profile={profile}
          side="bottom"
          align="end"
        />
      </div>

      {/* Sidebar Header & New Chat Trigger */}
      <div className="p-4 pb-2 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Messages
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-primary/10 text-primary">
              @{profile?.username || "me"}
            </span>
          </div>

          <NewChatDialog />
        </div>
      </div>

      {/* Dynamic Filterable Conversation List (Client Leaf) */}
      <SidebarConversationList />
    </aside>
  );
}
