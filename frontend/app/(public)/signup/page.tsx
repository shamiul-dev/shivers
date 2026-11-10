import type { Metadata } from "next";
import { Radio } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CenteredPageLayout } from "@/components/layout/centered-page-layout";
import { SignUpForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create an Account — Shivers",
  description: "Join Shivers for real-time channels and messaging.",
};

export default function SignUpPage() {
  return (
    <CenteredPageLayout badge="Chat">
      <Card variant="elevated">
        <CardHeader className="text-center pb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-md shadow-primary/30 mx-auto mb-4">
            <Radio className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Create your account
          </CardTitle>
          <CardDescription className="text-sm text-muted max-w-xs mx-auto">
            Start real-time conversations with your friends and teammates.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <SignUpForm />
        </CardContent>
      </Card>
    </CenteredPageLayout>
  );
}
