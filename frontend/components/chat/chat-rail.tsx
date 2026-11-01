import React from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageSquare } from "lucide-react";

import { UserMenuDropdown } from "@/components/chat/user-menu-dropdown";

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
        </nav>
      </div>

      {/* Bottom User Persona & Dropdown Menu */}
      <div className="flex flex-col items-center pb-2">
        <UserMenuDropdown
          user={user}
          profile={profile}
          side="right"
          align="end"
        />
      </div>
    </aside>
  );
}
