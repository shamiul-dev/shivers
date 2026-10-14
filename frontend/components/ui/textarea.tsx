import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const textareaVariants = cva(
  "flex min-h-[80px] w-full transition-all placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#4338CA]/20 focus-visible:border-[#4338CA]",
        filled:
          "rounded-xl border border-transparent bg-slate-100 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#4338CA]/20 focus-visible:bg-white focus-visible:border-[#4338CA]",
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
