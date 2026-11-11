"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { socket } from "@/lib/socket";
import { fetchMessagesAction } from "@/app/actions/chat";
import {
  selectConversationMessages,
  useChatStore,
  type PendingMessage,
} from "@/store/chatStore";
import type { Message, ReactionAggregate, SendMessageAck, Attachment } from "@/types/chat";

export type JoinState = "idle" | "joined" | "not_found";

export function useMessages(input: {
  conversationId: string;
  initialHistory?: Message[];
  sessionToken?: string;
}) {
  const { conversationId, initialHistory, sessionToken } = input;

  const committed = useChatStore(
    (state) => selectConversationMessages(state, conversationId).committed
  );
  const pending = useChatStore(
    (state) => selectConversationMessages(state, conversationId).pending
  );

  const [joinState, setJoinState] = useState<JoinState>("idle");

  // Seed once per conversation: hydration-provided history lands in the store
  const historySeedRef = useRef<Set<string> | undefined>(undefined);
  useEffect(() => {
    if (!initialHistory || historySeedRef.current?.has(conversationId)) return;
    (historySeedRef.current ??= new Set()).add(conversationId);
    useChatStore.getState().setHistory(conversationId, initialHistory);
  }, [conversationId, initialHistory]);

  useEffect(() => {
    // If socket is connected under a stale token, force disconnect so it reconnects with the current user
    const currentSocketToken = (socket.auth as { token?: string })?.token;
    if (sessionToken && currentSocketToken && currentSocketToken !== sessionToken && socket.connected) {
      socket.disconnect();
    }

    if (sessionToken) {
      socket.auth = { token: sessionToken };
    }

    const joinAndResync = () => {
      socket.emit("conversation:join", { conversationId }, (ack?: { ok: boolean }) => {
        setJoinState(ack?.ok ? "joined" : "not_found");
        if (!ack?.ok) return;
        // Reconnect re-sync: fetch after the last committed message
        const committedNow = useChatStore.getState();
        const list = selectConversationMessages(committedNow, conversationId).committed;
        const after = list.length > 0 ? list[list.length - 1].id : undefined;
        if (!after) return;
        void fetchMessagesAction(conversationId, { after })
          .then((res) => {
            if (!res.ok || !res.data) return;
            const store = useChatStore.getState();
            for (const m of res.data.messages) store.addCommitted(conversationId, m);
            const newest = res.data.messages[res.data.messages.length - 1]?.id;
            socket.emit("conversation:read", { conversationId, messageId: newest });
          })
          .catch(() => {});
      });
    };

    const handleNewMessage = (message: Message) => {
      if (!message || message.conversationId !== conversationId) return;
      const state = useChatStore.getState();
      const entry = selectConversationMessages(state, conversationId);
      const match = entry.pending.find((p) => p.clientId === message.clientId);
      if (match) {
        state.resolvePending(conversationId, message.clientId, message);
      } else {
        state.addCommitted(conversationId, message);
      }
      socket.emit("conversation:read", { conversationId, messageId: message.id });
    };

    // Edit or soft delete landed anywhere in the room: swap the message in place
    const handleUpdatedMessage = (message: Message) => {
      if (!message || message.conversationId !== conversationId) return;
      useChatStore.getState().applyMessageUpdate(conversationId, message);
    };

    // Reaction aggregate changed for one message in this conversation
    const handleReactions = (payload: {
      messageId: string;
      reactions: ReactionAggregate[];
    }) => {
      if (!payload?.messageId) return;
      useChatStore
        .getState()
        .setReactions(conversationId, payload.messageId, payload.reactions ?? []);
    };

    socket.on("connect", joinAndResync);
    socket.on("message:new", handleNewMessage);
    socket.on("message:updated", handleUpdatedMessage);
    socket.on("message:reactions", handleReactions);

    // If socket is disconnected, connect now with token
    if (!socket.connected) {
      socket.connect();
    } else {
      joinAndResync();
    }

    return () => {
      socket.off("connect", joinAndResync);
      socket.off("message:new", handleNewMessage);
      socket.off("message:updated", handleUpdatedMessage);
      socket.off("message:reactions", handleReactions);
    };
  }, [conversationId, sessionToken]);

  const send = useCallback(
    (body: string, attachment?: Attachment): string => {
      const clientId = crypto.randomUUID();
      const type = attachment ? (attachment.mime.startsWith("image/") ? "image" : "file") : "text";
      useChatStore.getState().addPending(conversationId, clientId, body, type, attachment);
      socket.emit(
        "message:send",
        {
          conversationId,
          clientId,
          body: body.trim(),
          type,
          attachmentId: attachment?.id,
        },
        (ack: SendMessageAck) => {
          if (ack.ok) {
            useChatStore.getState().resolvePending(conversationId, clientId, ack.message);
          } else {
            useChatStore.getState().markPendingFailed(conversationId, clientId);
          }
        }
      );
      return clientId;
    },
    [conversationId]
  );

  return useMemo(
    () => ({
      committed,
      pending,
      send,
      joinState,
    }),
    [committed, pending, send, joinState]
  );
}
export type { PendingMessage };
