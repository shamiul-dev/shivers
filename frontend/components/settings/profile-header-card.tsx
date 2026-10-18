import React from "react";
import { Camera } from "lucide-react";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";

interface ProfileHeaderCardProps {
  user: {
    name: string;
    image?: string | null;
  };
  profile: {
    username: string;
  } | null;
}

export function ProfileHeaderCard({ user, profile }: ProfileHeaderCardProps) {
  return (
    <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex items-center space-x-4">
          <UserAvatar
            name={user.name}
            username={profile?.username}
            image={user.image}
            size="xl"
            showPresence
            presenceStatus="online"
          />
          <div>
            <div className="flex items-center space-x-2">
              <CardTitle className="text-xl font-bold tracking-tight text-[#0F172A]">
                {user.name}
              </CardTitle>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Online
              </span>
            </div>
            <p className="text-sm font-medium text-[#4338CA] mt-0.5">
              @{profile?.username || "no-handle"}
            </p>
            <CardDescription className="text-xs text-[#64748B] mt-1">
              Manage your public persona and conversational presence.
            </CardDescription>
          </div>
        </div>

        <div>
          <button
            type="button"
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-[#0F172A] shadow-xs hover:bg-slate-50 transition-all cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-[#4338CA]" />
            <span>Change Photo</span>
          </button>
        </div>
      </div>
    </CardHeader>
  );
}
