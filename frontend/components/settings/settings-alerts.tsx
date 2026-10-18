"use client";

import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function SettingsAlerts() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const saved = searchParams.get("saved");

  if (error) {
    return (
      <div
        role="alert"
        className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-50/90 border border-red-200/80 text-red-700 text-xs font-medium leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200"
      >
        <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
        <span>{error}</span>
      </div>
    );
  }

  if (saved === "true") {
    return (
      <div
        role="status"
        className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200/80 text-emerald-800 text-xs font-medium leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200"
      >
        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
        <span>Profile updated successfully.</span>
      </div>
    );
  }

  return null;
}
