import React, { Suspense } from "react";
import { User, AtSign, AlignLeft } from "lucide-react";

import { updateProfileSettingsAction } from "@/app/actions/profile";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SettingsAlerts } from "@/components/settings/settings-alerts";
import { SettingsSubmitButton } from "@/components/settings/settings-submit-button";
import { ProfileHeaderCard } from "@/components/settings/profile-header-card";
import { AccountCredentialsSection } from "@/components/settings/account-credentials-section";

interface ProfileSettingsFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  profile: {
    username: string;
    bio?: string | null;
    avatarKey?: string | null;
  } | null;
}

export function ProfileSettingsForm({ user, profile }: ProfileSettingsFormProps) {
  return (
    <Card variant="elevated" className="overflow-hidden">
      <ProfileHeaderCard user={user} profile={profile} />

      <CardContent className="pt-6 space-y-6">
        <Suspense fallback={null}>
          <SettingsAlerts />
        </Suspense>

        <form action={updateProfileSettingsAction} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Display Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold text-[#0F172A] flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-[#4338CA]" />
                <span>Display Name</span>
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={user.name}
                placeholder="Your full name"
                required
                className="h-10 text-sm"
              />
              <p className="text-[11px] text-[#64748B]">
                Your visible name in direct messages and channel threads.
              </p>
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-semibold text-[#0F172A] flex items-center space-x-1.5">
                <AtSign className="w-3.5 h-3.5 text-[#4338CA]" />
                <span>Username Handle</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm select-none">
                  @
                </span>
                <Input
                  id="username"
                  name="username"
                  defaultValue={profile?.username || ""}
                  placeholder="username"
                  required
                  className="pl-8 h-10 text-sm lowercase"
                />
              </div>
              <p className="text-[11px] text-[#64748B]">
                Unique handle (3–20 chars, lowercase letters, numbers, underscores).
              </p>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-xs font-semibold text-[#0F172A] flex items-center space-x-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-[#4338CA]" />
              <span>Bio</span>
            </Label>
            <Textarea
              id="bio"
              name="bio"
              defaultValue={profile?.bio || ""}
              placeholder="What's your story? (e.g. Detective solving cases in Revachol)"
              maxLength={160}
              className="min-h-[88px] text-sm resize-none"
            />
            <div className="flex justify-between items-center text-[11px] text-[#64748B]">
              <span>Brief summary shown in your profile card.</span>
              <span>Max 160 characters</span>
            </div>
          </div>

          {/* Read-Only Account Info */}
          <AccountCredentialsSection email={user.email} />

          {/* Form Actions */}
          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
            <SettingsSubmitButton idleText="Save Changes" pendingText="Saving changes..." />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
