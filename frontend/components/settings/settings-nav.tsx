"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    name: "Profile",
    href: "/settings/profile",
    icon: User,
  },
  {
    name: "Security",
    href: "/settings/security",
    icon: Shield,
  },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60 max-w-fit">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href === "/settings/profile" && pathname === "/settings");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all",
              isActive
                ? "bg-white text-foreground shadow-xs shadow-slate-200"
                : "text-muted hover:text-foreground hover:bg-white/60"
            )}
          >
            <Icon className={cn("w-3.5 h-3.5", isActive ? "text-primary" : "text-muted")} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
