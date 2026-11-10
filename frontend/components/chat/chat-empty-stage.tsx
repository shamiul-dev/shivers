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
    <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 bg-background relative overflow-hidden select-none">
      {/* Ambient Gradient Accent */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-decor-glow/50 via-decor-haze/30 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="w-full max-w-lg space-y-6">
        <Card variant="elevated" className="text-center p-8 border-line/80 shadow-xl shadow-decor-glow/40">
          <CardContent className="p-0 space-y-6">
            {/* Shivers Beacon Icon */}
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-xl shadow-primary/25 p-3.5 mx-auto">
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
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Welcome to Shivers, {user.name.split(" ")[0]}
              </h2>
              <p className="text-sm font-semibold text-primary">
                @{profile?.username || "handle"}
              </p>
              <p className="text-xs text-muted max-w-xs mx-auto pt-1">
                Select a conversation from the sidebar or start a new thread to begin chatting in real time.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-3 pt-2 text-left">
              <div className="p-3.5 rounded-2xl bg-background border border-line/60 space-y-1">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-foreground">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                  <span>Real-Time Mesh</span>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Sub-50ms instant messaging via Socket.IO engine.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-background border border-line/60 space-y-1">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Secure Sessions</span>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
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
                  className="rounded-xl border-line text-xs gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5 text-primary" />
                  <span>Manage Profile</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer micro-tag */}
        <p className="text-center text-[11px] text-muted-subtle">
          Shivers v0.1 • Connected to Neon PostgreSQL & Express 5
        </p>
      </div>
    </div>
  );
}
