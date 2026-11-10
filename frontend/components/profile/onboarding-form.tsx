import { Suspense } from "react";
import { AtSign } from "lucide-react";
import { AuthInput } from "@/components/auth/auth-input";
import { BioInput } from "@/components/profile/bio-input";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { AuthErrorAlert } from "@/components/auth/auth-error-alert";
import { updateProfileAction } from "@/app/actions/profile";

interface OnboardingFormProps {
  defaultSuggested?: string;
}

export function OnboardingForm({ defaultSuggested = "" }: OnboardingFormProps) {
  return (
    <form action={updateProfileAction} className="space-y-4">
      <Suspense fallback={null}>
        <AuthErrorAlert />
      </Suspense>

      <AuthInput
        name="username"
        label="Username Handle"
        placeholder="e.g. detective_57"
        autoComplete="username"
        defaultValue={defaultSuggested}
        icon={AtSign}
        required
        minLength={3}
        maxLength={20}
      />

      <BioInput />

      <AuthSubmitButton pendingLabel="Claiming handle">Claim Handle & Continue</AuthSubmitButton>

      <p className="text-center text-xs text-slate-500 pt-3">
        Your handle will be unique to you and used in mentions and direct messages.
      </p>
    </form>
  );
}
