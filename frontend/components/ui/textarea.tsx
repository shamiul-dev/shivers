import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const textareaVariants = cva(
  "flex min-h-[80px] w-full transition-all placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "rounded-xl border border-line bg-surface text-foreground placeholder:text-muted-subtle focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary",
        filled:
          "rounded-xl border border-transparent bg-surface-muted text-foreground placeholder:text-muted-subtle focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:bg-surface focus-visible:border-primary",
      },
      sizeVariant: {
        default: "px-3.5 py-2.5 text-sm",
        sm: "px-3 py-2 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      sizeVariant: "default",
    },
  }
)

export interface TextareaProps
  extends React.ComponentProps<"textarea">,
    VariantProps<typeof textareaVariants> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, sizeVariant, ...props }, ref) => {
    return (
      <textarea
        className={cn(textareaVariants({ variant, sizeVariant, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea, textareaVariants }
