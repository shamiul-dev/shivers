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
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] relative flex flex-col justify-between selection:bg-[#E3DFFF] selection:text-[#100069]">
      {/* Ambient Gradient Header Accent */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-[#E5EEFF] via-[#EFF4FF] to-transparent -z-10 pointer-events-none" />

      {/* Global Header */}
      <header className="w-full max-w-6xl mx-auto px-6 pt-7 pb-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4338CA] to-[#2563EB] flex items-center justify-center shadow-lg shadow-[#4338CA]/20 p-2">
            <Image
              src="/shivers-symbol.svg"
              alt="Shivers"
              width={22}
              height={22}
              className="invert"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-xl tracking-tight text-[#0F172A]">
              Shivers
            </span>
            <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-[#4338CA]/10 text-[#4338CA] border border-[#4338CA]/20">
              {badge}
            </span>
          </div>
        </div>

        {/* Security / Status badge */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white border border-[#CBD5E1]/40 shadow-xs text-[#64748B] text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <ShieldCheck className="w-3.5 h-3.5 text-[#4338CA]" />
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
      <footer className="w-full max-w-6xl mx-auto px-6 py-6 text-center text-xs text-[#94A3B8]">
        © 2026 Shivers. Real-time messaging platform.
      </footer>
    </div>
  );
}
