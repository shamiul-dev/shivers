import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center font-semibold select-none transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-surface-muted text-strong hover:bg-surface-shade/80",
        indigo:
          "bg-primary text-on-primary shadow-xs shadow-primary/20",
        subtle:
          "bg-primary-tint text-primary border border-primary/10",
        online:
          "bg-emerald-50 text-emerald-700 border border-emerald-500/20",
        outline:
          "border border-line text-muted-strong bg-surface",
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

