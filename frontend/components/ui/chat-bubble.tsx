import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, CheckCheck, AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const chatBubbleVariants = cva(
  "relative max-w-[85%] md:max-w-[72%] text-[14px] leading-relaxed transition-all select-text break-words",
  {
    variants: {
      variant: {
        outbound:
          "bg-gradient-to-r from-[#4338CA] to-[#2563EB] text-white shadow-sm shadow-[#4338CA]/20",
        inbound:
          "bg-white border border-slate-200/80 text-[#0F172A] shadow-xs shadow-slate-900/5",
        pending:
          "bg-gradient-to-r from-[#4338CA]/75 to-[#2563EB]/75 text-white/90 shadow-none animate-pulse",
        failed:
          "bg-red-50 border border-red-200 text-red-900 shadow-xs",
      },
      podPosition: {
        single: "rounded-2xl",
        first: "rounded-2xl",
        middle: "rounded-2xl",
        last: "rounded-2xl",
      },
    },
    compoundVariants: [
      // Outbound pod corner adjustments (anchor at top-right or contracted inner right corners)
      {
        variant: ["outbound", "pending"],
        podPosition: "single",
        className: "rounded-2xl rounded-tr-sm",
      },
      {
        variant: ["outbound", "pending"],
        podPosition: "first",
        className: "rounded-2xl rounded-tr-sm rounded-br-md",
      },
      {
        variant: ["outbound", "pending"],
        podPosition: "middle",
        className: "rounded-2xl rounded-r-md",
      },
      {
        variant: ["outbound", "pending"],
        podPosition: "last",
        className: "rounded-2xl rounded-tr-md rounded-br-2xl",
      },
      // Inbound pod corner adjustments (anchor at top-left or contracted inner left corners)
      {
        variant: ["inbound", "failed"],
        podPosition: "single",
        className: "rounded-2xl rounded-tl-sm",
      },
      {
        variant: ["inbound", "failed"],
        podPosition: "first",
        className: "rounded-2xl rounded-tl-sm rounded-bl-md",
      },
      {
        variant: ["inbound", "failed"],
        podPosition: "middle",
        className: "rounded-2xl rounded-l-md",
      },
      {
        variant: ["inbound", "failed"],
        podPosition: "last",
        className: "rounded-2xl rounded-tl-md rounded-bl-2xl",
      },
    ],
    defaultVariants: {
      variant: "inbound",
      podPosition: "single",
    },
  }
);

export interface ChatBubbleProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof chatBubbleVariants> {
  time?: string;
  status?: "pending" | "sent" | "delivered" | "read" | "failed";
}

export function ChatBubble({
  className,
  variant,
  podPosition,
  children,
  time,
  status,
  ...props
}: ChatBubbleProps) {
  const isOutbound = variant === "outbound" || variant === "pending";

  return (
    <div
      className={cn(chatBubbleVariants({ variant, podPosition }), "px-4 py-2.5", className)}
      {...props}
    >
      <div className="leading-relaxed">{children}</div>

      {(time || status) && (
        <div
          className={cn(
            "flex items-center justify-end gap-1 mt-1 text-[11px] select-none",
            isOutbound ? "text-white/75" : "text-slate-400"
          )}
        >
          {time && <span>{time}</span>}

          {status === "pending" && (
            <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-ping" />
          )}

          {status === "sent" && <Check className="w-3.5 h-3.5 text-white/80" />}

          {status === "delivered" && (
            <CheckCheck className="w-3.5 h-3.5 text-white/85" />
          )}

          {status === "read" && (
            <CheckCheck className="w-3.5 h-3.5 text-cyan-200" />
          )}

          {status === "failed" && (
            <span className="flex items-center gap-1 text-red-600 font-semibold text-[10px]">
              <AlertCircle className="w-3 h-3" /> Failed
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export { chatBubbleVariants };

