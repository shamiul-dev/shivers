import * as React from "react";
import { Label } from "@/components/ui/label";
import { Textarea, type TextareaProps } from "@/components/ui/textarea";

interface BioInputProps extends TextareaProps {
  name?: string;
  label?: string;
  hint?: string;
}

export function BioInput({
  name = "bio",
  label = "Bio",
  hint = "(optional)",
  variant = "default",
  className,
  ...props
}: BioInputProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label
          htmlFor={name}
          className="text-xs font-semibold uppercase tracking-wider text-muted-strong"
        >
          {label} <span className="font-normal text-muted-subtle lowercase">{hint}</span>
        </Label>
        <span className="text-[11px] font-medium text-muted-subtle">
          Max 160 chars
        </span>
      </div>
      <Textarea
        id={name}
        name={name}
        variant={variant}
        placeholder="Tell others what brings you to Shivers..."
        maxLength={160}
        rows={3}
        className="resize-none"
        {...props}
      />
    </div>
  );
}
