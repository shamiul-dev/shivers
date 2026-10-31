"use client";

import { create } from "zustand";

import type { Message } from "@/types/chat";

export type PendingMessage = {
  clientId: string;
  body: string;
  failed?: boolean;
};

type ConversationMessages = {
  committed: Message[];
  pending: PendingMessage[];
};

type ChatState = {
  messages: Record<string, ConversationMessages>;
  setHistory: (conversationId: string, msgs: Message[]) => void;
  addCommitted: (conversationId: string, msg: Message) => void;
  addPending: (conversationId: string, clientId: string, body: string) => void;
  resolvePending: (
    conversationId: string,
    clientId: string,
    message: Message | null
  ) => void;
  markPendingFailed: (conversationId: string, clientId: string) => void;
  clear: (conversationId: string) => void;
};

function compareMessages(a: Message, b: Message): number {
  const ta = Date.parse(a.createdAt);
  const tb = Date.parse(b.createdAt);
  if (ta !== tb) return ta - tb;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function ensureEntry(
  messages: Record<string, ConversationMessages>,
  conversationId: string
): ConversationMessages {
  return messages[conversationId] ?? { committed: [], pending: [] };
}

export const useChatStore = create<ChatState>()((set) => ({
  messages: {},

  setHistory: (conversationId, msgs) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: {
          committed: [...msgs].sort(compareMessages),
          pending: ensureEntry(state.messages, conversationId).pending,
        },
      },
    })),

  addCommitted: (conversationId, msg) =>
    set((state) => {
      const entry = ensureEntry(state.messages, conversationId);
      // Dedupe: socket may deliver a message already committed (multi-tab echo)
      if (entry.committed.some((m) => m.id === msg.id)) return state;
      const committed = [...entry.committed, msg].sort(compareMessages);
      return {
        messages: {
          ...state.messages,
          [conversationId]: { committed, pending: entry.pending },
        },
      };
    }),

  addPending: (conversationId, clientId, body) =>
    set((state) => {
      const entry = ensureEntry(state.messages, conversationId);
      return {
        messages: {
          ...state.messages,
          [conversationId]: {
            committed: entry.committed,
            pending: [...entry.pending, { clientId, body }],
          },
        },
      };
    }),

  resolvePending: (conversationId, clientId, message) =>
    set((state) => {
      const entry = ensureEntry(state.messages, conversationId);
      const pending = entry.pending.filter((p) => p.clientId !== clientId);
      let committed = entry.committed;
      if (message && !committed.some((m) => m.id === message.id)) {
        committed = [...committed, message].sort(compareMessages);
      }
      return {
        messages: {
          ...state.messages,
          [conversationId]: { committed, pending },
        },
      };
    }),

  markPendingFailed: (conversationId, clientId) =>
    set((state) => {
      const entry = ensureEntry(state.messages, conversationId);
      const pending = entry.pending.map((p) =>
        p.clientId === clientId ? { ...p, failed: true } : p
      );
      return {
        messages: {
          ...state.messages,
          [conversationId]: { committed: entry.committed, pending },
        },
      };
    }),

  clear: (conversationId) =>
    set((state) => {
      const next = { ...state.messages };
      delete next[conversationId];
      return { messages: next };
    }),
}));

const EMPTY_MESSAGES: ConversationMessages = { committed: [], pending: [] };

export function selectConversationMessages(
  state: ChatState,
  conversationId: string
): ConversationMessages {
  return state.messages[conversationId] ?? EMPTY_MESSAGES;
}
