import React, { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Shield, KeyRound, Lock } from "lucide-react";

import { getProfile } from "@/app/actions/profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SettingsLoading from "../loading";

export const metadata: Metadata = {
  title: "Security Settings — Shivers",
  description: "Manage your credentials and active sessions on Shivers.",
};

async function SecuritySettingsContent() {
  const profileData = await getProfile();

  if (!profileData?.user) {
    redirect("/login");
  }

  if (!profileData.profile?.username) {
    redirect("/onboarding");
  }

  return (
    <Card variant="elevated">
      <CardHeader className="pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4338CA] to-[#2563EB] flex items-center justify-center text-white shadow-md shadow-[#4338CA]/20">
            <KeyRound className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold tracking-tight text-[#0F172A]">
              Password & Authentication
            </CardTitle>
            <CardDescription className="text-xs text-[#64748B]">
              Manage your credentials and password security.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/60 gap-4">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-[#0F172A] flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-[#4338CA]" />
              <span>Password</span>
            </span>
            <p className="text-xs text-[#64748B]">
              Your password is securely hashed with argon2id.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="text-xs rounded-xl border-slate-200 self-start sm:self-auto"
            disabled
          >
            <span>Change Password</span>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/60 gap-4">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-[#0F172A] flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Session Protection</span>
            </span>
            <p className="text-xs text-[#64748B]">
              Protected via httpOnly secure SameSite=Lax cookie sessions.
            </p>
          </div>

          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
            Active & Protected
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SecuritySettingsPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<SettingsLoading />}>
        <SecuritySettingsContent />
      </Suspense>
    </div>
  );
}
