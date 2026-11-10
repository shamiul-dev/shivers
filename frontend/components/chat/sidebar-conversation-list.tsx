"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, MessageSquare, Hash } from "lucide-react";

import { conversationsCache, type ConversationsData } from "@/hooks/conversations-cache";
import { markConversationReadAction } from "@/app/actions/chat";
import { socket } from "@/lib/socket";
import { usePresenceStore } from "@/store/presenceStore";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import type { Conversation, Message } from "@/types/chat";

function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function SidebarConversationList() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "dm" | "room">("all");
  const [search, setSearch] = useState("");
  const onlineUserIds = usePresenceStore((s) => s.onlineUserIds);

  const { data } = useQuery(conversationsCache.options());
  const conversations: Conversation[] = data?.conversations ?? [];

  // Clear unread count for the active conversation & persist read status
  useEffect(() => {
    if (!pathname.startsWith("/chat/")) return;
    const activeId = pathname.replace("/chat/", "");
    if (!activeId) return;

    queryClient.setQueryData<ConversationsData>(conversationsCache.key, (old) => {
      if (!old?.conversations) return old;
      const target = old.conversations.find((c) => c.id === activeId);
      if (!target || !target.unreadCount) return old;

      return {
        conversations: old.conversations.map((c) =>
          c.id === activeId ? { ...c, unreadCount: 0 } : c
        ),
      };
    });

    // Persist read state in the database so background refetches preserve 0 unread
    void markConversationReadAction(activeId);
    socket.emit("conversation:read", { conversationId: activeId });
  }, [pathname, queryClient]);

  // Real-time listener for incoming messages across all conversations
  useEffect(() => {
    const handleNewMessage = (msg: Message) => {
      if (!msg?.conversationId) return;

      queryClient.setQueryData<ConversationsData>(conversationsCache.key, (old) => {
        if (!old?.conversations) return old;

        const targetIndex = old.conversations.findIndex(
          (c) => c.id === msg.conversationId
        );

        if (targetIndex === -1) {
          // If a message arrives for a conversation not yet in sidebar, refetch the list
          void queryClient.invalidateQueries({ queryKey: conversationsCache.key });
          return old;
        }

        const target = old.conversations[targetIndex];
        const isCurrentActive = pathname === `/chat/${target.id}`;

        const updated: Conversation = {
          ...target,
          lastMessage: {
            id: msg.id,
            body: msg.body,
            senderId: msg.senderId,
            type: msg.type,
            createdAt: msg.createdAt,
          },
          unreadCount: isCurrentActive ? 0 : (target.unreadCount ?? 0) + 1,
        };

        // Bump to the top of the sidebar list
        const remaining = old.conversations.filter(
          (c) => c.id !== msg.conversationId
        );

        return {
          conversations: [updated, ...remaining],
        };
      });
    };

    const handleConversationCreated = () => {
      void queryClient.invalidateQueries({ queryKey: conversationsCache.key });
    };

    socket.on("message:new", handleNewMessage);
    socket.on("conversation:created", handleConversationCreated);
    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("conversation:created", handleConversationCreated);
    };
  }, [queryClient, pathname]);

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Type filter
      if (filter === "dm" && c.type !== "dm") return false;
      if (filter === "room" && c.type !== "room") return false;

      // Text search
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const title = (c.type === "dm" ? c.otherUser?.name : c.name) || "";
        const handle = c.otherUser?.username || "";
        return (
          title.toLowerCase().includes(query) || handle.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [conversations, filter, search]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Search Input & Filter Tabs */}
      <div className="px-4 py-2 space-y-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-subtle pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-surface-muted/80 border border-line/60 text-xs text-foreground placeholder:text-muted-subtle focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center space-x-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filter === "all"
                ? "bg-primary text-on-primary shadow-xs shadow-primary/20"
                : "bg-surface-muted text-muted hover:text-foreground hover:bg-surface-shade/60"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter("dm")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filter === "dm"
                ? "bg-primary text-on-primary shadow-xs shadow-primary/20"
                : "bg-surface-muted text-muted hover:text-foreground hover:bg-surface-shade/60"
            }`}
          >
            Direct
          </button>
          <button
            type="button"
            onClick={() => setFilter("room")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filter === "room"
                ? "bg-primary text-on-primary shadow-xs shadow-primary/20"
                : "bg-surface-muted text-muted hover:text-foreground hover:bg-surface-shade/60"
            }`}
          >
            Channels
          </button>
        </div>
      </div>

      {/* Scrollable Conversation Items */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {filteredConversations.length > 0 ? (
          filteredConversations.map((c) => {
            const isActive = pathname === `/chat/${c.id}`;
            const title =
              c.type === "dm"
                ? c.otherUser?.name || "Direct Message"
                : c.name || "Channel";
            const previewText =
              c.lastMessage?.body ||
              (c.type === "dm"
                ? c.otherUser?.username
                  ? `@${c.otherUser.username}`
                  : "Private chat"
                : "Channel thread");
            const timestamp = c.lastMessage
              ? formatTimestamp(c.lastMessage.createdAt)
              : formatTimestamp(c.createdAt);

            return (
              <Link
                key={c.id}
                href={`/chat/${c.id}`}
                className={`relative flex items-center gap-3 p-2.5 rounded-2xl transition-all select-none group cursor-pointer ${
                  isActive
                    ? "bg-primary-tint border border-primary/20 text-foreground"
                    : "hover:bg-background border border-transparent text-strong hover:text-foreground"
                }`}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <span className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full" />
                )}

                {/* Avatar / Icon */}
                {c.type === "dm" ? (
                  <UserAvatar
                    name={c.otherUser?.name}
                    username={c.otherUser?.username}
                    image={c.otherUser?.image}
                    size="md"
                    showPresence
                    presenceStatus={
                      (c.otherUser?.userId && onlineUserIds[c.otherUser.userId]) ||
                      (c.otherUser?.id && onlineUserIds[c.otherUser.id])
                        ? "online"
                        : "offline"
                    }
                  />
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 text-primary flex items-center justify-center shrink-0 font-bold text-sm shadow-xs">
                    <Hash className="w-4 h-4" />
                  </div>
                )}

                {/* Info Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`text-xs font-bold truncate ${
                        isActive ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {title}
                    </span>
                    <span className="text-[10px] text-muted-subtle font-medium shrink-0 ml-1">
                      {timestamp}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted truncate font-normal">
                      {previewText}
                    </p>
                    {c.unreadCount && c.unreadCount > 0 ? (
                      <Badge variant="indigo" size="counter" className="shrink-0">
                        {c.unreadCount > 99 ? "99+" : c.unreadCount}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center text-muted-subtle">
              <MessageSquare className="w-6 h-6 text-muted-subtle" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {search ? "No matching conversations" : "No conversations yet"}
              </p>
              <p className="text-xs text-muted max-w-[200px]">
                {search
                  ? "Try searching for a different handle or name."
                  : "Click 'New' above to start a direct message or create a channel."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
