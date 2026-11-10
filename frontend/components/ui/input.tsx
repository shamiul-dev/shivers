import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "rounded-xl border border-line bg-surface text-foreground placeholder:text-muted-subtle focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary",
        filled:
          "rounded-xl border border-transparent bg-surface-muted text-foreground placeholder:text-muted-subtle focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:bg-surface focus-visible:border-primary",
      },
      inputSize: {
        default: "h-10 px-3 py-2 text-sm",
        lg: "h-11 px-3.5 py-2.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
)

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, inputSize, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, inputSize, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
