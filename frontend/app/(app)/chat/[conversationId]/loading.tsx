import React from "react";

export default function ConversationLoading() {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8FAFC] animate-pulse">
      {/* Header Skeleton */}
      <div className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-200" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-3 w-20 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-100" />
          <div className="w-8 h-8 rounded-xl bg-slate-100" />
        </div>
      </div>

      {/* Message Stream Skeleton */}
      <div className="flex-1 p-6 space-y-4 max-w-[760px] w-full mx-auto flex flex-col justify-end">
        <div className="flex items-start gap-2 max-w-[60%]">
          <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
          <div className="h-12 w-48 rounded-2xl bg-slate-200/80" />
        </div>
        <div className="flex justify-end">
          <div className="h-14 w-64 rounded-2xl bg-slate-300/80" />
        </div>
        <div className="flex items-start gap-2 max-w-[60%]">
          <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
          <div className="h-10 w-40 rounded-2xl bg-slate-200/80" />
        </div>
        <div className="flex justify-end">
          <div className="h-10 w-32 rounded-2xl bg-slate-300/80" />
        </div>
      </div>

      {/* Composer Skeleton */}
      <div className="p-4 max-w-[760px] w-full mx-auto">
        <div className="h-12 w-full rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}

