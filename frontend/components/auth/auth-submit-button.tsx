"use client";

import { useFormStatus } from "react-dom";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthSubmitButtonProps {
  children: React.ReactNode;
  /** Message shown while the formaction runs; "..." is appended. */
  pendingLabel?: string;
}

export function AuthSubmitButton({ children, pendingLabel }: AuthSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="gradient"
      size="pill"
      disabled={pending}
      className="w-full mt-2"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          <span>{pendingLabel ?? "Please wait"}...</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </>
      )}
    </Button>
  );
}
