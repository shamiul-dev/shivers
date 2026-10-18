import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Search, MessageSquare, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="w-full md:w-[340px] lg:w-[360px] h-screen bg-white border-r border-slate-200/80 flex flex-col shrink-0 select-none">
      {/* Mobile-only header bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-[#F8FAFC]">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4338CA] to-[#2563EB] flex items-center justify-center p-1.5 shadow-xs">
            <Image
              src="/shivers-symbol.svg"
              alt="Shivers"
              width={18}
              height={18}
              className="invert"
            />
          </div>
          <span className="font-bold text-base text-[#0F172A]">Shivers</span>
        </div>

        <Link
          href="/settings/profile"
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/60 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </Link>
      </div>

      {/* Sidebar Header & New Chat Trigger */}
      <div className="p-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">
              Messages
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-[#4338CA]/10 text-[#4338CA]">
              @{profile?.username || "me"}
            </span>
          </div>

          <Button
            size="sm"
            variant="gradient"
            className="h-8 px-2.5 rounded-xl text-xs gap-1 shadow-xs"
            title="Start new conversation"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </Button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-100/80 border border-slate-200/60 text-xs text-[#0F172A] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4338CA]/20 focus:border-[#4338CA] transition-all"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center space-x-1.5 pt-1 overflow-x-auto">
          <button className="px-3 py-1 rounded-full text-xs font-semibold bg-[#4338CA] text-white shadow-xs cursor-pointer">
            All
          </button>
          <button className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-[#64748B] hover:text-[#0F172A] hover:bg-slate-200/60 transition-colors cursor-pointer">
            Direct
          </button>
          <button className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-[#64748B] hover:text-[#0F172A] hover:bg-slate-200/60 transition-colors cursor-pointer">
            Channels
          </button>
        </div>
      </div>

      {/* Conversations List (Scrollable Area) */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {/* Placeholder / Empty State before conversations exist */}
        <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <MessageSquare className="w-6 h-6 text-slate-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#0F172A]">
              No conversations yet
            </p>
            <p className="text-xs text-[#64748B] max-w-[200px]">
              Search for users by handle or create a room to start chatting.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs rounded-xl border-slate-200 gap-1.5 mt-2"
          >
            <Users className="w-3.5 h-3.5 text-[#4338CA]" />
            <span>Find People</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
