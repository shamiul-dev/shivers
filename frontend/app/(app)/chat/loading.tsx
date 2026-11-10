import React from "react";

export default function ChatStageLoading() {
  return (
    <div className="hidden md:flex flex-1 items-center justify-center bg-background animate-pulse">
      <div className="w-full max-w-md p-8 rounded-3xl bg-surface border border-line-soft shadow-sm space-y-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-surface-muted mx-auto" />
        <div className="h-6 w-48 bg-surface-shade rounded mx-auto" />
        <div className="h-4 w-64 bg-surface-muted rounded mx-auto" />
        <div className="h-10 w-36 bg-surface-muted rounded-xl mx-auto mt-4" />
      </div>
    </div>
  );
}
