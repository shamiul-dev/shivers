import React from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageSquare, Users, Settings, ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ChatEmptyStageProps {
  user: {
    name: string;
    image?: string | null;
  };
  profile: {
    username: string;
    bio?: string | null;
  } | null;
}

export function ChatEmptyStage({ user, profile }: ChatEmptyStageProps) {
  return (
    <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 bg-[#F8FAFC] relative overflow-hidden select-none">
      {/* Ambient Gradient Accent */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-[#DCE9FF]/50 via-[#EFF4FF]/30 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="w-full max-w-lg space-y-6">
        <Card variant="elevated" className="text-center p-8 border-slate-200/80 shadow-xl shadow-[#DCE9FF]/40">
          <CardContent className="p-0 space-y-6">
            {/* Shivers Beacon Icon */}
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#4338CA] to-[#2563EB] flex items-center justify-center shadow-xl shadow-[#4338CA]/25 p-3.5 mx-auto">
              <Image
                src="/shivers-symbol.svg"
                alt="Shivers"
                width={36}
                height={36}
                className="invert"
              />
            </div>

            {/* Greeting */}
            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold tracking-tight text-[#0F172A]">
                Welcome to Shivers, {user.name.split(" ")[0]}
              </h2>
              <p className="text-sm font-semibold text-[#4338CA]">
                @{profile?.username || "handle"}
              </p>
              <p className="text-xs text-[#64748B] max-w-xs mx-auto pt-1">
                Select a conversation from the sidebar or start a new thread to begin chatting in real time.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-3 pt-2 text-left">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#0F172A]">
                  <MessageSquare className="w-3.5 h-3.5 text-[#4338CA]" />
                  <span>Real-Time Mesh</span>
                </div>
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  Sub-50ms instant messaging via Socket.IO engine.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#0F172A]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Secure Sessions</span>
                </div>
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  Protected with BetterAuth cookie tokens.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link href="/settings/profile">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-slate-200 text-xs gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5 text-[#4338CA]" />
                  <span>Manage Profile</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer micro-tag */}
        <p className="text-center text-[11px] text-[#94A3B8]">
          Shivers v0.1 • Connected to Neon PostgreSQL & Express 5
        </p>
      </div>
    </div>
  );
}
