"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { MessageSquare } from "lucide-react";

import { useMessages } from "@/hooks/useMessages";
import { useTyping } from "@/hooks/useTyping";
import { ChatBubble } from "@/components/ui/chat-bubble";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ImageLightbox } from "@/components/chat/image-lightbox";
import {
  MessageActionsTrigger,
  MessageContextMenu,
  MessageReactionChips,
} from "@/components/chat/message-actions";
import { editMessageAction } from "@/app/actions/chat";
import { useChatStore } from "@/store/chatStore";
import type { Message, UserSummary } from "@/types/chat";

interface ChatMessagesViewProps {
  conversationId: string;
  currentUserId: string;
  initialHistory?: Message[];
  otherUser?: UserSummary | null;
  sessionToken?: string;
}

function formatTime(isoString?: string): string {
  if (!isoString) return "";
  try {
    return new Date(isoString).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatDateHeader(isoString?: string): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) return "Today";
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isYesterday) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

/** Inline editor shown in place of the bubble while a message is being edited. */
function MessageEditForm({
  conversationId,
  message,
  onCancel,
}: {
  conversationId: string;
  message: Message;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(message.body);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus and put the caret at the end on open
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, []);

  const save = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === message.body || saving) return;
    setSaving(true);
    const res = await editMessageAction(conversationId, message.id, trimmed);
    setSaving(false);
    if (res.ok) {
      // Socket echo confirms too; apply immediately for the sender's own view
      useChatStore.getState().applyMessageUpdate(conversationId, res.message);
      onCancel(); // closes the editor on success
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      onCancel();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void save();
    }
  };

  const dirty = value.trim().length > 0 && value !== message.body;

  return (
    <div className="w-full min-w-[14rem] rounded-2xl border border-primary/40 bg-surface p-2 shadow-sm">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        rows={2}
        maxLength={4000}
        aria-label="Edit message"
        className="w-full resize-none rounded-lg bg-transparent px-1 py-0.5 text-[14px] leading-relaxed text-foreground outline-none"
      />
      <div className="mt-1 flex items-center justify-end gap-1.5">
        <span className="mr-auto text-[10px] text-muted select-none">
          Enter to save · Esc to cancel
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-3 py-1 text-xs font-semibold text-muted-strong transition-colors hover:bg-surface-shade select-none"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!dirty || saving}
          className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50 select-none"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

export function ChatMessagesView({
  conversationId,
  currentUserId,
  initialHistory = [],
  otherUser,
  sessionToken,
}: ChatMessagesViewProps) {
  const { committed, pending, send, joinState } = useMessages({
    conversationId,
    initialHistory,
    sessionToken,
  });

  const { typingUsers, handleKeystroke, stopTyping } = useTyping(
    conversationId,
    currentUserId
  );

  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; fileName?: string } | null>(null);

  // Inline edit mode: holds the id of the message being edited (null = none)
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSaveEdit = async (message: Message, body: string) => {
    const res = await editMessageAction(conversationId, message.id, body);
    if (res.ok) {
      // Socket echo confirms too; apply immediately for the sender's own view
      useChatStore.getState().applyMessageUpdate(conversationId, res.message);
      setEditingId(null);
    }
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const isInitialMountRef = useRef(true);

  // Reset initial mount flag whenever switching conversation threads
  useEffect(() => {
    isInitialMountRef.current = true;
  }, [conversationId]);

  // Combine committed + pending messages for unified display.
  // Committed items carry the full Message (editedAt, deletedAt, reactions);
  // pending items are synthesized in the same shape (blank createdAt = no time row).
  const allMessages = useMemo(() => {
    const list: Array<Message & { isPending?: boolean; failed?: boolean }> = committed.map(
      (m) => ({ ...m })
    );

    for (const p of pending) {
      list.push({
        id: p.clientId,
        conversationId,
        senderId: currentUserId,
        type: p.type ?? "text",
        body: p.body,
        clientId: p.clientId,
        createdAt: "",
        editedAt: null,
        deletedAt: null,
        attachment: p.attachment ?? null,
        isPending: true,
        failed: p.failed,
      });
    }

    return list;
  }, [committed, pending, currentUserId, conversationId]);

  // Scroll helper
  const scrollToBottom = React.useCallback((behavior: "instant" | "smooth" = "instant") => {
    if (scrollContainerRef.current) {
      if (behavior === "instant") {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      } else {
        scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, []);

  // Position at recent message: instant snap on load, smooth animation on new messages
  useEffect(() => {
    if (allMessages.length === 0) return;

    if (isInitialMountRef.current) {
      scrollToBottom("instant");
      isInitialMountRef.current = false;
      return;
    }

    scrollToBottom("smooth");
  }, [committed.length, pending.length, typingUsers.length, allMessages.length, scrollToBottom]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Scrollable Message Timeline */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-4 space-y-4"
      >
        {allMessages.length > 0 ? (
          <div className="w-full max-w-4xl mx-auto space-y-3">
            {allMessages.map((msg, i) => {
              const isOutbound = msg.senderId === currentUserId;
              const prevMsg = allMessages[i - 1];
              const nextMsg = allMessages[i + 1];

              const sameSenderAsPrev = prevMsg && prevMsg.senderId === msg.senderId;
              const sameSenderAsNext = nextMsg && nextMsg.senderId === msg.senderId;

              // Calculate podPosition for asymmetric corners
              let podPosition: "single" | "first" | "middle" | "last" = "single";
              if (!sameSenderAsPrev && sameSenderAsNext) podPosition = "first";
              else if (sameSenderAsPrev && sameSenderAsNext) podPosition = "middle";
              else if (sameSenderAsPrev && !sameSenderAsNext) podPosition = "last";

              // Date divider
              const showDateHeader =
                !prevMsg ||
                formatDateHeader(prevMsg.createdAt) !== formatDateHeader(msg.createdAt);

              const isDeleted = !!msg.deletedAt;
              const isEditing = editingId === msg.id;
              const settled = !msg.isPending && !msg.failed;

              const bubbleVariant = msg.failed
                ? "failed"
                : msg.isPending
                ? "pending"
                : isDeleted
                ? "tombstone"
                : isOutbound
                ? "outbound"
                : "inbound";

              const actionProps = {
                conversationId,
                message: msg,
                isOutbound,
                onEdit: () => setEditingId(msg.id),
              };

              return (
                <React.Fragment key={msg.id}>
                  {showDateHeader && msg.createdAt && (
                    <div className="flex justify-center my-3">
                      <span className="px-3 py-1 rounded-full bg-surface-shade/60 border border-line-strong/40 text-[10px] font-semibold text-muted-strong select-none">
                        {formatDateHeader(msg.createdAt)}
                      </span>
                    </div>
                  )}

                  <div
                    className={`flex items-end gap-2.5 w-full ${
                      isOutbound ? "justify-end" : "justify-start"
                    } ${sameSenderAsPrev ? "mt-1" : "mt-3"}`}
                  >
                    {/* Inbound Sender Avatar */}
                    {!isOutbound && (
                      <div className="w-8 shrink-0">
                        {!sameSenderAsNext && (
                          <UserAvatar
                            name={otherUser?.name}
                            username={otherUser?.username}
                            image={otherUser?.image}
                            size="sm"
                          />
                        )}
                      </div>
                    )}

                    <div
                      className={`flex flex-col ${
                        isOutbound ? "items-end" : "items-start"
                      } w-fit max-w-[85%] md:max-w-[72%]`}
                    >
                      {/* Sender name for first message in inbound group */}
                      {!isOutbound && !sameSenderAsPrev && otherUser?.name && (
                        <span className="text-[11px] font-semibold text-foreground ml-1 mb-1">
                          {otherUser.name}
                        </span>
                      )}

                      {/* Action trigger + bubble (settled messages; tombstones keep
                          only their chips, no actions) */}
                      {isEditing ? (
                        <MessageEditForm
                          conversationId={conversationId}
                          message={msg}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : settled ? (
                        <div className="flex min-w-0 items-center gap-1">
                          {isOutbound && !isDeleted && (
                            <MessageActionsTrigger {...actionProps} />
                          )}
                          <MessageContextMenu {...actionProps}>
                            <ChatBubble
                              variant={bubbleVariant}
                              podPosition={podPosition}
                              time={formatTime(msg.createdAt)}
                              status={
                                msg.failed
                                  ? "failed"
                                  : msg.isPending
                                  ? "pending"
                                  : isOutbound
                                  ? "sent"
                                  : undefined
                              }
                              edited={!isDeleted && !!msg.editedAt}
                              attachment={isDeleted ? null : msg.attachment}
                              onImageClick={(url, fileName) => setLightboxMedia({ url, fileName })}
                              onMediaLoad={() => {
                                const el = scrollContainerRef.current;
                                if (!el) return;
                                const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 400;
                                if (isNearBottom) {
                                  scrollToBottom("instant");
                                }
                              }}
                            >
                              {isDeleted ? "Message deleted" : msg.body}
                            </ChatBubble>
                          </MessageContextMenu>
                          {!isOutbound && !isDeleted && (
                            <MessageActionsTrigger {...actionProps} />
                          )}
                        </div>
                      ) : (
                        <ChatBubble
                          variant={bubbleVariant}
                          podPosition={podPosition}
                          time={formatTime(msg.createdAt)}
                          status={msg.failed ? "failed" : "pending"}
                          attachment={msg.attachment}
                          onImageClick={(url, fileName) => setLightboxMedia({ url, fileName })}
                        >
                          {msg.body}
                        </ChatBubble>
                      )}

                      {/* Reaction chips (tombstones keep their reactions visible) */}
                      {settled && !isEditing && (
                        <MessageReactionChips
                          conversationId={conversationId}
                          message={msg}
                          className="mt-1"
                        />
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            {/* Peer Typing Indicator Bubble */}
            {typingUsers.length > 0 && (
              <div className="flex items-end gap-2.5 w-full justify-start mt-2">
                <UserAvatar
                  name={otherUser?.name}
                  username={otherUser?.username}
                  image={otherUser?.image}
                  size="sm"
                  className="mb-1"
                />
                <div className="bg-surface-muted text-muted rounded-2xl rounded-bl-sm px-3.5 py-2 flex items-center gap-1.5 shadow-xs border border-line/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                  <span className="text-[11px] font-medium text-muted ml-1">
                    {otherUser?.name ? `${otherUser.name} is typing...` : "typing..."}
                  </span>
                </div>
              </div>
            )}

            <div ref={scrollAnchorRef} className="h-2 shrink-0" />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface border border-line shadow-sm flex items-center justify-center text-primary">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                No messages yet
              </p>
              <p className="text-xs text-muted max-w-xs">
                Send the first message below to start the conversation in real time.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Message Composer Dock */}
      <ChatComposer
        conversationId={conversationId}
        onSend={send}
        onTyping={handleKeystroke}
        onStopTyping={stopTyping}
        disabled={joinState === "not_found"}
      />

      {/* Fullscreen Photo Lightbox Modal */}
      <ImageLightbox
        url={lightboxMedia?.url ?? null}
        fileName={lightboxMedia?.fileName}
        onClose={() => setLightboxMedia(null)}
      />
    </div>
  );
}
