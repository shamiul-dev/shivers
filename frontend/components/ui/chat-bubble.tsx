"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, CheckCheck, AlertCircle, FileText, Download } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Attachment } from "@/types/chat";

function formatBytes(bytes?: number) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const chatBubbleVariants = cva(
  "relative w-fit min-w-[3.5rem] max-w-full text-[14px] leading-relaxed transition-all select-text break-words whitespace-pre-wrap",
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
  attachment?: Attachment | null;
  onImageClick?: (url: string, fileName?: string) => void;
}

export function ChatBubble({
  className,
  variant,
  podPosition,
  children,
  time,
  status,
  attachment,
  onImageClick,
  ...props
}: ChatBubbleProps) {
  const isOutbound = variant === "outbound" || variant === "pending";
  const [imageError, setImageError] = React.useState(false);

  const thumbUrl = attachment
    ? attachment.thumbUrl || attachment.url || ""
    : "";
  const fullUrl = attachment ? attachment.url || attachment.thumbUrl || "" : "";

  return (
    <div
      className={cn(chatBubbleVariants({ variant, podPosition }), "px-4 py-2.5", className)}
      {...props}
    >
      {/* Attachment Display */}
      {attachment && (
        <div className="mb-2">
          {attachment.mime.startsWith("image/") && !imageError ? (
            <div
              className="rounded-xl overflow-hidden cursor-pointer max-w-[280px] sm:max-w-[340px] max-h-[340px] bg-black/5"
              onClick={() => onImageClick?.(fullUrl, attachment.fileName)}
            >
              <img
                src={thumbUrl}
                alt={attachment.fileName}
                className="w-full h-full object-cover transition-transform hover:scale-102"
                loading="lazy"
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            <a
              href={fullUrl}
              download={attachment.fileName}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-2.5 p-2 rounded-xl transition-colors select-none",
                isOutbound
                  ? "bg-white/10 hover:bg-white/20 text-white"
                  : "bg-slate-100 hover:bg-slate-200/80 text-slate-800"
              )}
            >
              <FileText className="w-5 h-5 shrink-0" />
              <div className="min-w-0 max-w-[180px]">
                <p className="text-xs font-semibold truncate">{attachment.fileName}</p>
                <p className="text-[10px] opacity-75">{formatBytes(attachment.sizeBytes)}</p>
              </div>
              <Download className="w-3.5 h-3.5 ml-auto opacity-75" />
            </a>
          )}
        </div>
      )}

      {children && <div className="leading-relaxed break-words">{children}</div>}

      {(time || status) && (
        <div
          className={cn(
            "flex items-center justify-end gap-1 mt-1 text-[11px] select-none shrink-0",
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
