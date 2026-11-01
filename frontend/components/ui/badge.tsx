import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center font-semibold select-none transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-slate-100 text-slate-700 hover:bg-slate-200/80",
        indigo:
          "bg-[#4338CA] text-white shadow-xs shadow-[#4338CA]/20",
        subtle:
          "bg-[#EEF2FF] text-[#4338CA] border border-[#4338CA]/10",
        online:
          "bg-emerald-50 text-emerald-700 border border-emerald-500/20",
        outline:
          "border border-slate-200 text-slate-600 bg-white",
      },
      size: {
        xs: "text-[10px] px-1.5 py-0.5 rounded-md",
        sm: "text-xs px-2.5 py-0.5 rounded-full",
        counter: "w-5 h-5 rounded-full text-[10px] p-0 font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { badgeVariants };

