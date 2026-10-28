import React, { Suspense } from "react";
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

async function OnboardingContent() {
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
    <Card variant="elevated">
      <OnboardingCardHeader />
      <CardContent>
        <OnboardingForm defaultSuggested={suggestedHandle} />
      </CardContent>
    </Card>
  );
}

function OnboardingCardSkeleton() {
  return (
    <Card variant="elevated">
      <OnboardingCardHeader />
      <CardContent>
        <div className="space-y-4 animate-pulse">
          <div className="space-y-1.5">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-11 w-full bg-slate-100 rounded-xl border border-slate-200/60" />
          </div>
          <div className="space-y-1.5">
            <div className="h-4 w-28 bg-slate-200 rounded" />
            <div className="h-20 w-full bg-slate-100 rounded-xl border border-slate-200/60" />
          </div>
          <div className="h-11 w-full bg-slate-200 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function OnboardingPage() {
  return (
    <CenteredPageLayout badge="Onboarding" statusBadge="Identity Gate">
      <Suspense fallback={<OnboardingCardSkeleton />}>
        <OnboardingContent />
      </Suspense>
    </CenteredPageLayout>
  );
}
