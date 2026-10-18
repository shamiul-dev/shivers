import React from "react";

export default function ChatStageLoading() {
  return (
    <div className="hidden md:flex flex-1 items-center justify-center bg-[#F8FAFC] animate-pulse">
      <div className="w-full max-w-md p-8 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 mx-auto" />
        <div className="h-6 w-48 bg-slate-200 rounded mx-auto" />
        <div className="h-4 w-64 bg-slate-100 rounded mx-auto" />
        <div className="h-10 w-36 bg-slate-100 rounded-xl mx-auto mt-4" />
      </div>
    </div>
  );
}
