import type { Metadata } from "next";
import { Suspense } from "react";
import { Radio } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CenteredPageLayout } from "@/components/layout/centered-page-layout";
import { LoginForm } from "@/components/auth/login-form";
import { SessionCleaner } from "@/components/auth/session-cleaner";

export const metadata: Metadata = {
  title: "Sign In — Shivers",
  description: "Sign in to your Shivers account to continue chatting.",
};

export default function LoginPage() {
  return (
    <CenteredPageLayout badge="Chat">
      {/* Server side already determined the session is dead: guarantee the
          stale cookie is cleared even when the bounce happened client-side */}
      <Suspense fallback={null}>
        <SessionCleaner />
      </Suspense>
      <Card variant="elevated">
        <CardHeader className="text-center pb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4338CA] to-[#2563EB] flex items-center justify-center text-white shadow-md shadow-[#4338CA]/30 mx-auto mb-4">
            <Radio className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
            Welcome back
          </CardTitle>
          <CardDescription className="text-sm text-[#64748B] max-w-xs mx-auto">
            Enter your credentials to access your conversations.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </CenteredPageLayout>
  );
}
