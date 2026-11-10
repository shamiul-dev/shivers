import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col justify-between selection:bg-selection-tint selection:text-selection-contrast">
      {/* Ambient Gradient Header Accent */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-decor-mist via-decor-haze to-transparent -z-10 pointer-events-none" />

      {/* Global Header */}
      <header className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7 pb-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 p-2">
            <Image
              src="/shivers-symbol.svg"
              alt="Shivers"
              width={22}
              height={22}
              className="invert"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-xl tracking-tight text-foreground">
              Shivers
            </span>
            <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-primary/10 text-primary border border-primary/20">
              Settings
            </span>
          </div>
        </div>

        {/* Back to Chat Link */}
        <Link
          href="/chat"
          className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-300/60 shadow-xs text-foreground hover:bg-slate-50 transition-all text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-primary" />
          <span>Back to Chat</span>
        </Link>
      </header>

      {/* Main Settings Stage */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Account Settings
            </h1>
            <p className="text-xs text-muted mt-0.5">
              Customize your profile details, avatar, and security preferences.
            </p>
          </div>

          <SettingsNav />
        </div>

        <div>{children}</div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-6 py-6 text-center text-xs text-muted-subtle">
        © 2026 Shivers. Real-time messaging platform.
      </footer>
    </div>
  );
}
