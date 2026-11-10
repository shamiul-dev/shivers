"use client";

import React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const themeOptions = [
  {
    value: "light",
    label: "Light",
    description: "Bright surfaces with indigo accents. The classic Shivers look.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Dimmed for late-night conversations. Arrives with the next update.",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Follows your device's appearance setting automatically.",
    icon: Monitor,
  },
] as const;

export function ThemePicker() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // System shows what it actually resolves to, so users aren't guessing.
  const resolvedNote =
    mounted && theme === "system" && resolvedTheme
      ? ` (currently ${resolvedTheme})`
      : "";

  return (
    <Card variant="elevated" className="overflow-hidden">
      <div className="border-b border-line-soft bg-gradient-to-r from-background/60 to-surface px-6 py-5">
        <h2 className="text-lg font-bold tracking-tight text-foreground">Theme</h2>
        <p className="text-xs text-muted mt-0.5">
          Choose how Shivers looks on this device. Your choice is saved per browser.
        </p>
      </div>

      <CardContent className="pt-6">
        <div
          role="radiogroup"
          aria-label="Theme"
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isDarkPlaceholder = option.value === "dark";
            const selected = mounted && theme === option.value;

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                data-theme-option={option.value}
                onClick={() => setTheme(option.value)}
                disabled={isDarkPlaceholder}
                className={cn(
                  "relative flex flex-col items-start space-y-3 rounded-2xl border p-4 text-left transition-all",
                  isDarkPlaceholder
                    ? "border-line/40 bg-surface-muted/40 opacity-60 cursor-not-allowed"
                    : selected
                      ? "border-primary/60 bg-primary/5 shadow-xs ring-1 ring-primary/20 cursor-pointer"
                      : "border-line/80 bg-surface hover:border-line-strong/60 hover:bg-background cursor-pointer"
                )}
              >
                {/* Selected indicator */}
                {selected && (
                  <span className="absolute top-3 right-3 inline-flex w-5 h-5 items-center justify-center rounded-full bg-primary text-on-primary">
                    <Check className="w-3 h-3" />
                  </span>
                )}

                {/* Mini previews */}
                <span
                  className={cn(
                    "inline-flex w-11 h-11 items-center justify-center rounded-xl border",
                    isDarkPlaceholder
                      ? "border-line-strong bg-line-strong/60"
                      : selected
                        ? "border-primary/25 bg-primary/10"
                        : "border-line-soft bg-surface-muted"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5",
                      isDarkPlaceholder
                        ? "text-muted-subtle"
                        : selected
                          ? "text-primary"
                          : "text-muted"
                    )}
                  />
                </span>

                <span className="text-sm font-semibold text-foreground">
                  {option.label}
                  {option.value === "system" && resolvedNote && (
                    <span className="font-medium text-muted">{resolvedNote}</span>
                  )}
                </span>
                <span
                  className={cn(
                    "text-[11px] leading-relaxed",
                    isDarkPlaceholder ? "text-muted-subtle" : "text-muted"
                  )}
                >
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>

        {mounted && theme === "system" && resolvedTheme === "dark" && (
          <p className="mt-5 flex items-center space-x-1.5 text-[11px] font-medium text-primary">
            <Moon className="w-3 h-3" />
            <span>Your system is currently in dark mode — Shivers will follow automatically once the dark theme arrives.</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
