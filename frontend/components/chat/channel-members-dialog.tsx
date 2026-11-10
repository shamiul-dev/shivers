"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Users, UserPlus, Search, Check, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import {
  fetchChannelMembersAction,
  addChannelMemberAction,
  searchUsersAction,
} from "@/app/actions/chat";
import type { ChannelMember } from "@/types/chat";

interface ChannelMembersDialogProps {
  conversationId: string;
  channelName: string;
}

export function ChannelMembersDialog({
  conversationId,
  channelName,
}: ChannelMembersDialogProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"members" | "add">("members");
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; name: string; username: string; image?: string | null }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [addedUserIds, setAddedUserIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Load members when dialog opens
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setIsLoadingMembers(true);
    setErrorMessage(null);

    void fetchChannelMembersAction(conversationId).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setMembers(res.members);
      }
      setIsLoadingMembers(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, conversationId]);

  // Search users for adding
  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    setErrorMessage(null);

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

  const handleAddMember = (targetUserId: string) => {
    setAddingUserId(targetUserId);
    setErrorMessage(null);

    startTransition(async () => {
      const res = await addChannelMemberAction(conversationId, targetUserId);
      setAddingUserId(null);

      if (res.ok) {
        setAddedUserIds((prev) => new Set(prev).add(targetUserId));
        // Refresh members list
        const updated = await fetchChannelMembersAction(conversationId);
        if (updated.ok) {
          setMembers(updated.members);
        }
      } else {
        setErrorMessage(res.error);
      }
    });
  };

  const memberUserIds = new Set(members.map((m) => m.userId));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-9 h-9 rounded-xl hover:bg-surface-muted hover:text-primary flex items-center justify-center transition-colors cursor-pointer text-muted"
          title="Channel members"
        >
          <Users className="w-4 h-4" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>#{channelName}</span>
          </DialogTitle>
          <DialogDescription>
            View members or invite colleagues to this channel.
          </DialogDescription>
        </DialogHeader>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-surface-muted p-1 gap-1">
          <button
            type="button"
            onClick={() => {
              setTab("members");
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === "members"
                ? "bg-surface text-primary shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Members ({members.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("add");
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === "add"
                ? "bg-surface text-primary shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add People</span>
          </button>
        </div>

        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
            {errorMessage}
          </div>
        )}

        {/* Tab 1: Current Members */}
        {tab === "members" && (
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {isLoadingMembers ? (
              <div className="py-8 flex justify-center text-muted-subtle">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-subtle">
                No members found.
              </p>
            ) : (
              members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-background transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserAvatar
                      name={member.name}
                      username={member.username}
                      image={member.image}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {member.name}
                      </p>
                      <p className="text-[11px] text-muted-subtle truncate">
                        @{member.username || "user"}
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant={member.role === "owner" ? "indigo" : "subtle"}
                    size="xs"
                    className="capitalize text-[10px]"
                  >
                    {member.role}
                  </Badge>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Add People */}
        {tab === "add" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-subtle" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => void handleSearch(e.target.value)}
                placeholder="Search by name or username..."
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-surface-muted/80 border border-line/60 text-xs text-foreground placeholder:text-muted-subtle focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                autoFocus
              />
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {isSearching ? (
                <div className="py-6 flex justify-center text-muted-subtle">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : searchResults.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-subtle">
                  {searchQuery.trim().length < 2
                    ? "Type at least 2 characters to search users..."
                    : "No users found."}
                </p>
              ) : (
                searchResults.map((user) => {
                  const isAlreadyMember =
                    memberUserIds.has(user.id) || addedUserIds.has(user.id);
                  const isAdding = addingUserId === user.id;

                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-background transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar
                          name={user.name}
                          username={user.username}
                          image={user.image}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {user.name}
                          </p>
                          <p className="text-[11px] text-muted-subtle truncate">
                            @{user.username}
                          </p>
                        </div>
                      </div>

                      {isAlreadyMember ? (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium px-2 py-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Member</span>
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="gradient"
                          disabled={isAdding}
                          onClick={() => handleAddMember(user.id)}
                          className="h-7 px-3 text-xs rounded-lg cursor-pointer"
                        >
                          {isAdding ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            "Add"
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

