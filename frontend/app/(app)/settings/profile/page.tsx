import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getProfile } from "@/app/actions/profile";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";

export const metadata: Metadata = {
  title: "Profile Settings — Shivers",
  description: "Update your profile display name, handle, avatar, and bio.",
};

export default async function ProfileSettingsPage() {
  const profileData = await getProfile();

  if (!profileData?.user) {
    redirect("/login");
  }

  // Identity gate: if no username claimed yet, redirect to onboarding
  if (!profileData.profile?.username) {
    redirect("/onboarding");
  }

  return (
    <div className="space-y-6">
      <ProfileSettingsForm
        user={profileData.user}
        profile={profileData.profile}
      />
    </div>
  );
}
