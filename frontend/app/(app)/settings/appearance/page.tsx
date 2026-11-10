import React, { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getProfile } from "@/app/actions/profile";
import { ThemePicker } from "@/components/settings/theme-picker";
import SettingsLoading from "../loading";

export const metadata: Metadata = {
  title: "Appearance — Shivers",
  description: "Choose how Shivers looks: light, dark, or follow your system.",
};

async function AppearanceContent() {
  const profileData = await getProfile();

  if (!profileData?.user) {
    redirect("/login?expired=true");
  }

  // Identity gate: if no username claimed yet, redirect to onboarding
  if (!profileData.profile?.username) {
    redirect("/onboarding");
  }

  return (
    <div className="space-y-6">
      <ThemePicker />
    </div>
  );
}

export default function AppearanceSettingsPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<SettingsLoading />}>
        <AppearanceContent />
      </Suspense>
    </div>
  );
}
