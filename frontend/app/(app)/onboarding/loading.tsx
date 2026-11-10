import { Card, CardContent } from "@/components/ui/card";
import { CenteredPageLayout } from "@/components/layout/centered-page-layout";
import { OnboardingCardHeader } from "@/components/profile/onboarding-card-header";

export default function OnboardingLoading() {
  return (
    <CenteredPageLayout badge="Onboarding" statusBadge="Identity Gate">
      <Card variant="elevated">
        <OnboardingCardHeader />
        <CardContent>
          <div className="space-y-4 animate-pulse">
            {/* Username Field Skeleton */}
            <div className="space-y-1.5">
              <div className="h-4 w-32 bg-surface-shade rounded" />
              <div className="h-11 w-full bg-surface-muted rounded-xl border border-line/60" />
            </div>

            {/* Bio Field Skeleton */}
            <div className="space-y-1.5">
              <div className="h-4 w-28 bg-surface-shade rounded" />
              <div className="h-20 w-full bg-surface-muted rounded-xl border border-line/60" />
            </div>

            {/* Submit Button Skeleton */}
            <div className="h-11 w-full bg-surface-shade rounded-xl" />

            <div className="h-3 w-64 bg-surface-muted rounded mx-auto mt-3" />
          </div>
        </CardContent>
      </Card>
    </CenteredPageLayout>
  );
}
