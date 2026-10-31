import { queryOptions } from "@tanstack/react-query";

import { fetchConversationsAction } from "@/app/actions/chat";
import type { Conversation } from "@/types/chat";

export type ConversationsData = {
  conversations: Conversation[];
};

export function emptyConversations(): ConversationsData {
  return { conversations: [] };
}

export const conversationsCache = {
  key: ["conversations"] as const,
  options: () =>
    queryOptions({
      queryKey: conversationsCache.key,
      queryFn: async (): Promise<ConversationsData> => {
        // Server Action proxy — browser never calls Express REST directly (house policy)
        return fetchConversationsAction();
      },
      staleTime: 30_000,
    }),
};
