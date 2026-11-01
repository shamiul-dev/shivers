"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SettingsSubmitButtonProps {
  idleText?: string;
  pendingText?: string;
}

export function SettingsSubmitButton({
  idleText = "Save Changes",
  pendingText = "Saving changes...",
}: SettingsSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="gradient"
      size="pill"
      disabled={pending}
      className="w-full sm:w-auto min-w-[140px]"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          <span>{pendingText}</span>
        </>
      ) : (
        <>
          <Check className="w-4 h-4 mr-1.5" />
          <span>{idleText}</span>
        </>
      )}
    </Button>
  );
}
