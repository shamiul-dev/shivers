import React from "react";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";

interface CenteredPageLayoutProps {
  badge: string;
  statusBadge?: string;
  children: React.ReactNode;
}

export function CenteredPageLayout({
  badge,
  statusBadge = "Real-time Secure Mesh",
  children,
}: CenteredPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col justify-between selection:bg-selection-tint selection:text-selection-contrast">
      {/* Ambient Gradient Header Accent */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-decor-mist via-decor-haze to-transparent -z-10 pointer-events-none" />

      {/* Global Header */}
      <header className="w-full max-w-6xl mx-auto px-6 pt-7 pb-4 flex items-center justify-between">
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
              {badge}
            </span>
          </div>
        </div>

        {/* Security / Status badge */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-surface border border-line-strong/40 shadow-xs text-muted text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span>{statusBadge}</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md mx-auto">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-6 text-center text-xs text-muted-subtle">
        © 2026 Shivers. Real-time messaging platform.
      </footer>
    </div>
  );
}
