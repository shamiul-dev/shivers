"use client";

import Link from "next/link";
import { ArrowLeft, Phone, Video, Search, Info, Hash } from "lucide-react";

import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { usePresenceStore } from "@/store/presenceStore";
import { ChannelMembersDialog } from "@/components/chat/channel-members-dialog";
import type { Conversation } from "@/types/chat";

interface ChatHeaderProps {
  conversation: Conversation;
}

export function ChatHeader({ conversation }: ChatHeaderProps) {
  const isDm = conversation.type === "dm";
  const onlineUserIds = usePresenceStore((s) => s.onlineUserIds);
  const peerId = conversation.otherUser?.userId || conversation.otherUser?.id;
  const isOnline = Boolean(isDm && peerId && onlineUserIds[peerId]);

  const title = isDm
    ? conversation.otherUser?.name || "Direct Message"
    : conversation.name || "Channel";
  const subtitle = isDm
    ? isOnline
      ? "Active now"
      : "Offline"
    : "Channel room";

  return (
    <header className="h-16 bg-white/90 backdrop-blur-md z-20 flex items-center justify-between px-4 md:px-6 border-b border-slate-200/80 shrink-0 select-none">
      <div className="flex items-center gap-3">
        {/* Mobile Back Button */}
        <Link
          href="/chat"
          className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          title="Back to conversations"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Conversation Persona */}
        <div className="relative">
          {isDm ? (
            <UserAvatar
              name={conversation.otherUser?.name}
              username={conversation.otherUser?.username}
              image={conversation.otherUser?.image}
              size="md"
              showPresence
              presenceStatus={isOnline ? "online" : "offline"}
            />
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4338CA] to-[#2563EB] text-white flex items-center justify-center font-bold text-sm shadow-xs shadow-[#4338CA]/20">
              <Hash className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* Title and Meta */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-[15px] text-[#0F172A] leading-tight truncate">
              {title}
            </h1>
            {!isDm && (
              <Badge variant="subtle" size="xs">
                Room
              </Badge>
            )}
          </div>
          <p
            className={`text-[11.5px] font-medium flex items-center gap-1 mt-0.5 ${
              isDm
                ? isOnline
                  ? "text-emerald-600"
                  : "text-slate-400"
                : "text-indigo-600"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isDm
                  ? isOnline
                    ? "bg-emerald-500"
                    : "bg-slate-300"
                  : "bg-indigo-500"
              }`}
            />
            <span>{subtitle}</span>
          </p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-1 text-slate-500">
        {!isDm && (
          <ChannelMembersDialog
            conversationId={conversation.id}
            channelName={conversation.name || "channel"}
          />
        )}
        <button
          type="button"
          className="w-9 h-9 rounded-xl hover:bg-slate-100 hover:text-[#4338CA] flex items-center justify-center transition-colors cursor-pointer"
          title="Audio call"
        >
          <Phone className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="w-9 h-9 rounded-xl hover:bg-slate-100 hover:text-[#4338CA] flex items-center justify-center transition-colors cursor-pointer"
          title="Video meeting"
        >
          <Video className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="w-9 h-9 rounded-xl hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
          title="Search conversation"
        >
          <Search className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-slate-200 mx-1" />
        <button
          type="button"
          className="w-9 h-9 rounded-xl hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
          title="Conversation details"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

