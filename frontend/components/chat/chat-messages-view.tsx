"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { MessageSquare } from "lucide-react";

import { useMessages } from "@/hooks/useMessages";
import { useTyping } from "@/hooks/useTyping";
import { ChatBubble } from "@/components/ui/chat-bubble";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ImageLightbox } from "@/components/chat/image-lightbox";
import type { Message, UserSummary, Attachment } from "@/types/chat";

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

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const isInitialMountRef = useRef(true);

  // Reset initial mount flag whenever switching conversation threads
  useEffect(() => {
    isInitialMountRef.current = true;
  }, [conversationId]);

  // Combine committed + pending messages for unified display
  const allMessages = useMemo(() => {
    const list: Array<{
      id: string;
      senderId: string;
      body: string;
      createdAt?: string;
      isPending?: boolean;
      failed?: boolean;
      attachment?: Attachment | null;
    }> = committed.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      body: m.body,
      createdAt: m.createdAt,
      attachment: m.attachment,
    }));

    for (const p of pending) {
      list.push({
        id: p.clientId,
        senderId: currentUserId,
        body: p.body,
        isPending: true,
        failed: p.failed,
        attachment: p.attachment,
      });
    }

    return list;
  }, [committed, pending, currentUserId]);

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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8FAFC]">
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

              const bubbleVariant = msg.failed
                ? "failed"
                : msg.isPending
                ? "pending"
                : isOutbound
                ? "outbound"
                : "inbound";

              return (
                <React.Fragment key={msg.id}>
                  {showDateHeader && msg.createdAt && (
                    <div className="flex justify-center my-3">
                      <span className="px-3 py-1 rounded-full bg-slate-200/60 border border-slate-300/40 text-[10px] font-semibold text-slate-600 select-none">
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
                        <span className="text-[11px] font-semibold text-[#0F172A] ml-1 mb-1">
                          {otherUser.name}
                        </span>
                      )}

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
                        attachment={msg.attachment}
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
                        {msg.body}
                      </ChatBubble>
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
                <div className="bg-slate-100 text-slate-500 rounded-2xl rounded-bl-sm px-3.5 py-2 flex items-center gap-1.5 shadow-xs border border-slate-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                  <span className="text-[11px] font-medium text-slate-500 ml-1">
                    {otherUser?.name ? `${otherUser.name} is typing...` : "typing..."}
                  </span>
                </div>
              </div>
            )}

            <div ref={scrollAnchorRef} className="h-2 shrink-0" />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-[#4338CA]">
              <MessageSquare className="w-6 h-6 text-[#4338CA]" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#0F172A]">
                No messages yet
              </p>
              <p className="text-xs text-[#64748B] max-w-xs">
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
