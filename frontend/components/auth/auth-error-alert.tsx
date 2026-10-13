"use client";

import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";

export function AuthErrorAlert() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  if (!error) return null;

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
