"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MessageSquare, Users, Sparkles, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/user-avatar";
import { searchUsersAction, startDmAction, createChannelAction } from "@/app/actions/chat";
import { conversationsCache } from "@/hooks/conversations-cache";

export function NewChatDialog() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"dm" | "room">("dm");
  const [query, setQuery] = useState("");
  const [channelName, setChannelName] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; name: string; username: string; image?: string | null; bio?: string | null }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (val: string) => {
    setQuery(val);
    setError(null);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await searchUsersAction(val);
      setSearchResults(res.users);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUser = (targetUserId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await startDmAction(targetUserId);
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: conversationsCache.key });
        setOpen(false);
        router.push(`/chat/${res.conversationId}`);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await createChannelAction(channelName.trim());
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: conversationsCache.key });
        setOpen(false);
        setChannelName("");
        router.push(`/chat/${res.conversationId}`);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="gradient"
          className="h-8 px-2.5 rounded-xl text-xs gap-1 shadow-xs cursor-pointer"
          title="Start new conversation"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            Search for people to message directly or create a channel room.
          </DialogDescription>
        </DialogHeader>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
          <button
            type="button"
            onClick={() => {
              setTab("dm");
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === "dm"
                ? "bg-white text-primary shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Direct Message</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("room");
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === "room"
                ? "bg-white text-primary shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Create Channel</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
            {error}
          </div>
        )}

        {tab === "dm" ? (
          <div className="space-y-3 pt-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by name or @username..."
                className="pl-9 h-10 text-xs rounded-xl"
                autoFocus
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
              )}
            </div>

            {/* Results List */}
            <div className="max-h-60 overflow-y-auto space-y-1">
              {searchResults.length > 0 ? (
                searchResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u.id)}
                    disabled={isPending}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 transition-colors text-left cursor-pointer group disabled:opacity-50"
                  >
                    <UserAvatar
                      name={u.name}
                      username={u.username}
                      image={u.image}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate group-hover:text-primary">
                        {u.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        @{u.username}
                      </p>
                    </div>
                  </button>
                ))
              ) : query.trim().length >= 2 && !isSearching ? (
                <p className="text-center py-6 text-xs text-slate-400">
                  No users found matching &ldquo;{query}&rdquo;
                </p>
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  Type at least 2 characters to search Shivers users.
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateChannel} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label htmlFor="room-name" className="text-xs font-semibold text-foreground">
                Channel Name
              </label>
              <Input
                id="room-name"
                name="name"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="e.g. general, design-guild, random"
                required
                className="h-10 text-xs rounded-xl"
                autoFocus
              />
              <p className="text-[11px] text-muted">
                Public or private group room for multiple members.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="gradient"
                size="sm"
                disabled={isPending || !channelName.trim()}
                className="rounded-xl text-xs gap-1.5 cursor-pointer"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{isPending ? "Creating..." : "Create Channel"}</span>
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
