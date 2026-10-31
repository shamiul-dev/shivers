"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { socket } from "@/lib/socket";
import { fetchMessagesAction } from "@/app/actions/chat";
import {
  selectConversationMessages,
  useChatStore,
  type PendingMessage,
} from "@/store/chatStore";
import type { Message, SendMessageAck } from "@/types/chat";

export type JoinState = "idle" | "joined" | "not_found";

export function useMessages(input: {
  conversationId: string;
  initialHistory?: Message[];
}) {
  const { conversationId, initialHistory } = input;

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
    // One connection app-wide; every mounted thread joins only its own room
    socket.connect();

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
    };

    socket.on("connect", joinAndResync);
    socket.on("message:new", handleNewMessage);
    if (socket.connected) joinAndResync();

    return () => {
      socket.off("connect", joinAndResync);
      socket.off("message:new", handleNewMessage);
    };
  }, [conversationId]);

  const send = useCallback(
    (body: string): string => {
      const clientId = crypto.randomUUID();
      useChatStore.getState().addPending(conversationId, clientId, body);
      socket.emit(
        "message:send",
        { conversationId, clientId, body: body.trim() },
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

  const grouped = useMemo(
    () => ({ committed, pending: pending as PendingMessage[] }),
    [committed, pending]
  );

  return { ...grouped, joinState, send };
}
