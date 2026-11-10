"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { User, Shield, LogOut, Loader2 } from "lucide-react";

import { signOutAction } from "@/app/actions/auth";
import { socket } from "@/lib/socket";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface UserMenuDropdownProps {
  user: {
    name: string;
    image?: string | null;
  };
  profile: {
    username: string;
  } | null;
  side?: "right" | "top" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

export function UserMenuDropdown({
  user,
  profile,
  side = "right",
  align = "end",
}: UserMenuDropdownProps) {
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    socket.disconnect();
    startTransition(async () => {
      await signOutAction();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="User account menu"
          className="group relative rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
        >
          <UserAvatar
            name={user.name}
            username={profile?.username}
            image={user.image}
            size="md"
            showPresence
            presenceStatus="online"
            className="ring-2 ring-transparent group-hover:ring-primary/30 transition-all"
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={side}
        align={align}
        sideOffset={14}
        className="w-64 p-2 bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-900/10"
      >
        {/* User Identity Header */}
        <DropdownMenuLabel className="p-2 pb-2.5">
          <div className="flex items-center space-x-3">
            <UserAvatar
              name={user.name}
              username={profile?.username}
              image={user.image}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground truncate">
                {user.name}
              </p>
              <p className="text-[11px] font-medium text-slate-500 truncate">
                @{profile?.username || "me"}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Online
            </span>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Navigation items */}
        <DropdownMenuItem asChild>
          <Link
            href="/settings/profile"
            className="flex items-center space-x-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-slate-100 transition-colors"
          >
            <User className="w-4 h-4 text-slate-500" />
            <span>Profile Settings</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href="/settings/security"
            className="flex items-center space-x-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-slate-100 transition-colors"
          >
            <Shield className="w-4 h-4 text-slate-500" />
            <span>Security & Password</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Sign Out item */}
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            handleSignOut();
          }}
          disabled={isPending}
          className="flex items-center space-x-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 focus:bg-rose-50 focus:text-rose-700 transition-colors cursor-pointer"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
          ) : (
            <LogOut className="w-4 h-4 text-rose-600" />
          )}
          <span>{isPending ? "Signing out..." : "Sign out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

