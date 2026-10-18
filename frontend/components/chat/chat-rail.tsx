import React from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageSquare, Settings, LogOut } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";

interface ChatRailProps {
  user: {
    name: string;
    image?: string | null;
  };
  profile: {
    username: string;
  } | null;
}

export function ChatRail({ user, profile }: ChatRailProps) {
  return (
    <aside className="w-[68px] hidden md:flex flex-col items-center justify-between py-5 bg-white border-r border-slate-200/80 z-20 shrink-0 h-screen select-none">
      {/* Top Brand Beacon */}
      <div className="flex flex-col items-center space-y-6">
        <Link
          href="/chat"
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4338CA] to-[#2563EB] flex items-center justify-center shadow-md shadow-[#4338CA]/20 p-2 transition-transform hover:scale-105"
          title="Shivers Home"
        >
          <Image
            src="/shivers-symbol.svg"
            alt="Shivers"
            width={22}
            height={22}
            className="invert"
          />
        </Link>

        {/* Navigation Rail Links */}
        <nav className="flex flex-col items-center space-y-2">
          <Link
            href="/chat"
            className="relative w-11 h-11 rounded-2xl flex items-center justify-center bg-[#EEF2FF] text-[#4338CA] transition-colors group"
            title="Messages"
          >
            <MessageSquare className="w-5 h-5 text-[#4338CA]" />
            <span className="absolute left-0 w-1 h-5 bg-[#4338CA] rounded-r-full" />
          </Link>

          <Link
            href="/settings/profile"
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </nav>
      </div>

      {/* Bottom User Persona & Sign Out */}
      <div className="flex flex-col items-center space-y-3">
        <Link
          href="/settings/profile"
          className="group relative"
          title={`Signed in as @${profile?.username || user.name}`}
        >
          <UserAvatar
            name={user.name}
            username={profile?.username}
            image={user.image}
            size="md"
            showPresence
            presenceStatus="online"
            className="ring-2 ring-transparent group-hover:ring-[#4338CA]/30 transition-all"
          />
        </Link>

        <form action="/api/auth/sign-out" method="POST">
          <button
            type="submit"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}
