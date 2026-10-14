import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getProfile } from "@/app/actions/profile";
import { Card, CardContent } from "@/components/ui/card";
import { CenteredPageLayout } from "@/components/layout/centered-page-layout";
import { OnboardingCardHeader } from "@/components/profile/onboarding-card-header";
import { OnboardingForm } from "@/components/profile/onboarding-form";
import { generateSuggestedHandle } from "@/lib/profile";

export const metadata: Metadata = {
  title: "Set up your Profile — Shivers",
  description: "Claim your unique handle to join conversations and rooms on Shivers.",
};

export default async function OnboardingPage() {
  const profileData = await getProfile();

  // If user session is invalid, redirect to login
  if (!profileData?.user) {
    redirect("/login");
  }

  // Gate check: If user already claimed a username, proceed straight to chat
  if (profileData.profile?.username) {
    redirect("/chat");
  }

  const suggestedHandle = generateSuggestedHandle(profileData.user.name);

  return (
    <CenteredPageLayout badge="Onboarding" statusBadge="Identity Gate">
      <Card variant="elevated">
        <OnboardingCardHeader />
        <CardContent>
          <OnboardingForm defaultSuggested={suggestedHandle} />
        </CardContent>
      </Card>
    </CenteredPageLayout>
  );
}
