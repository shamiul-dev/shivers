"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Smile, Paperclip, Mic } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ChatComposerProps {
  onSend: (body: string) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  disabled?: boolean;
}

export function ChatComposer({
  onSend,
  onTyping,
  onStopTyping,
  disabled = false,
}: ChatComposerProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onStopTyping?.();
    onSend(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative z-20 px-3 sm:px-4 md:px-8 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/90 to-transparent shrink-0">
      <div className="w-full max-w-4xl mx-auto bg-white border border-slate-200/80 rounded-2xl shadow-[0_4px_20px_rgba(11,28,48,0.06)] p-1.5 flex items-end gap-1.5 transition-all focus-within:border-[#4338CA]/40 focus-within:ring-2 focus-within:ring-[#4338CA]/10">
        {/* Attachment Button */}
        <button
          type="button"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#4338CA] hover:bg-slate-100 transition-colors shrink-0 mb-0.5 cursor-pointer"
          title="Add attachment"
          disabled={disabled}
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Text Input */}
        <div className="flex-1 min-w-0 py-1">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value.trim().length > 0) {
                onTyping?.();
              } else {
                onStopTyping?.();
              }
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Type a message..."
            className="w-full bg-transparent text-[14px] text-[#0F172A] placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed block max-h-32"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0 mb-0.5">
          <button
            type="button"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Emoji"
            disabled={disabled}
          >
            <Smile className="w-4 h-4" />
          </button>

          {text.trim() ? (
            <Button
              type="button"
              size="icon"
              variant="gradient"
              onClick={handleSubmit}
              disabled={disabled}
              className="w-8 h-8 rounded-xl shrink-0 shadow-xs"
              title="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <button
              type="button"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title="Voice message"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sub-dock Keyboard Hint */}
      <div className="max-w-[760px] mx-auto mt-1 flex items-center justify-between px-2 text-[10px] text-slate-400 select-none">
        <span>
          <strong className="font-semibold text-slate-500">Return</strong> to send ·{" "}
          <strong className="font-semibold text-slate-500">Shift + Return</strong> for new line
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          Shivers Instant Mesh
        </span>
      </div>
    </div>
  );
}

