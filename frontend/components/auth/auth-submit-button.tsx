"use client";

import { useFormStatus } from "react-dom";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthSubmitButtonProps {
  children?: React.ReactNode;
}

export function AuthSubmitButton({ children = "Create Account" }: AuthSubmitButtonProps) {
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
          <span>Creating account...</span>
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
