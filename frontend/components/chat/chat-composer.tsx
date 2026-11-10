"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Smile, Paperclip, Mic, X, Loader2, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EmojiPicker } from "@/components/chat/emoji-picker";
import { uploadAttachmentAction } from "@/app/actions/chat";
import type { Attachment } from "@/types/chat";

interface ChatComposerProps {
  conversationId: string;
  onSend: (body: string, attachment?: Attachment) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  disabled?: boolean;
}

function formatBytes(bytes?: number) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatComposer({
  conversationId,
  onSend,
  onTyping,
  onStopTyping,
  disabled = false,
}: ChatComposerProps) {
  const [text, setText] = useState("");
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const handleInsertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      setText((prev) => prev + emoji);
      onTyping?.();
      return;
    }

    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const newText = text.substring(0, start) + emoji + text.substring(end);

    setText(newText);
    onTyping?.();

    // Preserve cursor position directly after the inserted emoji
    requestAnimationFrame(() => {
      el.focus();
      const nextPos = start + emoji.length;
      el.setSelectionRange(nextPos, nextPos);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await uploadAttachmentAction(conversationId, formData);
      if (res.ok && res.attachment) {
        setPendingAttachment(res.attachment);
      }
    } catch (err) {
      console.error("Failed to upload file:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if ((!trimmed && !pendingAttachment) || disabled || isUploading) return;

    onStopTyping?.();
    onSend(trimmed, pendingAttachment || undefined);
    setText("");
    setPendingAttachment(null);

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

  const canSend = text.trim().length > 0 || Boolean(pendingAttachment);
  const previewUrl = pendingAttachment
    ? pendingAttachment.thumbUrl || pendingAttachment.url || ""
    : "";

  return (
    <div className="relative z-20 px-3 sm:px-4 md:px-8 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 bg-gradient-to-t from-background via-background/90 to-transparent shrink-0">
      {/* Hidden File Picker Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
      />

      {/* Pending Attachment Chip */}
      {(pendingAttachment || isUploading) && (
        <div className="w-full max-w-4xl mx-auto mb-2 px-1 flex items-center gap-2">
          {isUploading ? (
            <div className="flex items-center gap-2 bg-white border border-slate-200/80 rounded-2xl px-3.5 py-2 shadow-xs text-xs text-slate-600 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Uploading attachment...</span>
            </div>
          ) : pendingAttachment ? (
            <div className="flex items-center gap-2.5 bg-white border border-slate-200/80 rounded-2xl p-1.5 pr-3 shadow-md shadow-slate-900/5 group">
              {pendingAttachment.mime.startsWith("image/") ? (
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/60">
                  <img
                    src={previewUrl}
                    alt={pendingAttachment.fileName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-primary flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0 max-w-[200px] sm:max-w-[280px]">
                <p className="text-xs font-semibold text-foreground truncate">
                  {pendingAttachment.fileName}
                </p>
                <p className="text-[10px] text-slate-400">
                  {formatBytes(pendingAttachment.sizeBytes)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingAttachment(null)}
                className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer ml-1"
                title="Remove attachment"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Main Composer Box */}
      <div className="w-full max-w-4xl mx-auto bg-white border border-slate-200/80 rounded-2xl shadow-[0_4px_20px_rgba(11,28,48,0.06)] p-1.5 flex items-end gap-1.5 transition-all focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10">
        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors shrink-0 mb-0.5 cursor-pointer"
          title="Add photo or document"
          disabled={disabled || isUploading}
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
            placeholder={pendingAttachment ? "Add a caption..." : "Type a message..."}
            className="w-full bg-transparent text-[14px] text-foreground placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed block max-h-32"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0 mb-0.5">
          {/* Emoji Popover */}
          <Popover open={isEmojiOpen} onOpenChange={setIsEmojiOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                  isEmojiOpen
                    ? "bg-primary-tint text-primary"
                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                }`}
                title="Insert emoji"
                disabled={disabled}
              >
                <Smile className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="end"
              sideOffset={10}
              className="p-0 border-slate-200/90 shadow-2xl shadow-primary/15 rounded-2xl overflow-hidden w-auto"
            >
              <EmojiPicker onSelect={handleInsertEmoji} />
            </PopoverContent>
          </Popover>

          {canSend ? (
            <Button
              type="button"
              size="icon"
              variant="gradient"
              onClick={handleSubmit}
              disabled={disabled || isUploading}
              className="w-8 h-8 rounded-xl shrink-0 shadow-xs cursor-pointer"
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
      <div className="hidden sm:flex max-w-4xl mx-auto mt-1.5 items-center justify-between px-2 text-[11px] text-slate-400">
        <span>
          <strong className="font-semibold text-slate-600">Enter</strong> to send &bull;{" "}
          <strong className="font-semibold text-slate-600">Shift + Enter</strong> for new line
        </span>
        <span className="flex items-center gap-1 text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> End-to-end encrypted
        </span>
      </div>
    </div>
  );
}
