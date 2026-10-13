import { Suspense } from "react";
import Link from "next/link";
import { User, Mail } from "lucide-react";

import { AuthInput } from "@/components/auth/auth-input";
import { PasswordField } from "@/components/auth/password-field";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { AuthErrorAlert } from "@/components/auth/auth-error-alert";
import { signUpAction } from "@/app/actions/auth";

export function SignUpForm() {
  return (
    <form action={signUpAction} className="space-y-4">
      <Suspense fallback={null}>
        <AuthErrorAlert />
      </Suspense>

      <AuthInput
        name="name"
        label="Full Name"
        placeholder="Jane Doe"
        autoComplete="name"
        icon={User}
        required
      />

      <AuthInput
        name="email"
        label="Email Address"
        type="email"
        placeholder="you@domain.com"
        autoComplete="email"
        icon={Mail}
        required
      />

      <PasswordField
        name="password"
        label="Password"
        placeholder="Minimum 8 characters"
        autoComplete="new-password"
        required
      />

      <AuthSubmitButton>Create Account</AuthSubmitButton>

      <p className="text-center text-xs text-slate-500 pt-3">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-[#4338CA] hover:text-[#2563EB] transition-colors"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
