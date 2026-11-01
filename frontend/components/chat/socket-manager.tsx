"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { socket } from "@/lib/socket";
import { conversationsCache } from "@/hooks/conversations-cache";
import { usePresenceStore } from "@/store/presenceStore";

export function SocketManager({ sessionToken }: { sessionToken?: string }) {
  const { data } = useQuery(conversationsCache.options());

  // Socket connection lifecycle
  useEffect(() => {
    if (!sessionToken) return;

    const currentToken = (socket.auth as { token?: string } | undefined)?.token;
    if (currentToken && currentToken !== sessionToken && socket.connected) {
      socket.disconnect();
    }

    socket.auth = { token: sessionToken };

    if (!socket.connected) {
      socket.connect();
    }
  }, [sessionToken]);

  // Real-time presence listeners and initial sync
  useEffect(() => {
    const handlePresenceUpdate = ({
      userId,
      status,
    }: {
      userId: string;
      status: "online" | "offline";
    }) => {
      if (!userId) return;
      usePresenceStore.getState().setUserStatus(userId, status);
    };

    const queryPeerPresence = () => {
      const peerIds = (data?.conversations ?? [])
        .map((c) => c.otherUser?.userId || c.otherUser?.id)
        .filter((id): id is string => Boolean(id));

      if (peerIds.length === 0) return;

      socket.emit(
        "presence:query",
        { userIds: peerIds },
        (res?: { onlineUserIds?: string[] }) => {
          if (Array.isArray(res?.onlineUserIds)) {
            usePresenceStore.getState().setUsersOnline(res.onlineUserIds);
          }
        }
      );
    };

    socket.on("presence:update", handlePresenceUpdate);
    socket.on("connect", queryPeerPresence);

    if (socket.connected) {
      queryPeerPresence();
    }

    return () => {
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("connect", queryPeerPresence);
    };
  }, [data?.conversations]);

  return null;
}

