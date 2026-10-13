import { Suspense } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";

import { AuthInput } from "@/components/auth/auth-input";
import { PasswordField } from "@/components/auth/password-field";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { AuthErrorAlert } from "@/components/auth/auth-error-alert";
import { signInAction } from "@/app/actions/auth";

export function LoginForm() {
  return (
    <form action={signInAction} className="space-y-4">
      <Suspense fallback={null}>
        <AuthErrorAlert />
      </Suspense>

      <AuthInput
        name="email"
        label="Email Address"
        type="email"
        placeholder="you@domain.com"
        autoComplete="email"
        icon={Mail}
        required
      />

      <div className="space-y-1.5">
        <PasswordField
          name="password"
          label="Password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-[#4338CA] hover:text-[#2563EB] transition-colors"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <AuthSubmitButton>Sign In</AuthSubmitButton>

      <p className="text-center text-xs text-slate-500 pt-3">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-[#4338CA] hover:text-[#2563EB] transition-colors"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
