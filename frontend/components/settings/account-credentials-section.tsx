import React from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { Label } from "@/components/ui/label";

interface AccountCredentialsSectionProps {
  email: string;
}

export function AccountCredentialsSection({ email }: AccountCredentialsSectionProps) {
  return (
    <div className="pt-2 border-t border-line-soft">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-subtle mb-3">
        Account Credentials
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted flex items-center space-x-1.5">
            <Mail className="w-3.5 h-3.5 text-muted-subtle" />
            <span>Email Address</span>
          </Label>
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-background border border-line/60 text-xs font-medium text-foreground">
            <span className="truncate">{email}</span>
            <span className="inline-flex items-center space-x-1 text-emerald-600 shrink-0 ml-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold">Verified</span>
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted">
            Account Status
          </Label>
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-background border border-line/60 text-xs font-medium text-foreground">
            <span>BetterAuth Active Session</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
