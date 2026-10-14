import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuthInputProps extends InputProps {
  name: string;
  label: string;
  icon?: LucideIcon;
}

export function AuthInput({
  name,
  label,
  icon: Icon,
  inputSize = "lg",
  variant = "default",
  className,
  ...props
}: AuthInputProps) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={name}
        className="text-xs font-semibold uppercase tracking-wider text-slate-600"
      >
        {label}
      </Label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        )}
        <Input
          id={name}
          name={name}
          variant={variant}
          inputSize={inputSize}
          className={Icon ? "pl-10" : undefined}
          {...props}
        />
      </div>
    </div>
  );
}
