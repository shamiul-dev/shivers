import { Sparkles } from "lucide-react";
import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function OnboardingCardHeader() {
  return (
    <CardHeader className="text-center pb-6">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4338CA] to-[#2563EB] flex items-center justify-center text-white shadow-md shadow-[#4338CA]/30 mx-auto mb-4">
        <Sparkles className="w-6 h-6 text-white" />
      </div>
      <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
        Choose your identity
      </CardTitle>
      <CardDescription className="text-sm text-[#64748B] max-w-xs mx-auto">
        Claim your unique handle to join conversations and rooms on Shivers.
      </CardDescription>
    </CardHeader>
  );
}
