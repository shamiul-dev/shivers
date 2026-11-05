// Service-layer event bus for chat lifecycle events.
// Services publish domain events; the socket layer subscribes and translates
// them into io emissions + room joins. Keeps services import-clean of sockets.
import { EventEmitter } from "node:events";

import type { ConversationRow } from "@/db/schema";

export interface ConversationCreatedEvent {
    conversation: ConversationRow;
    // Member ids to auto-join into the conversation room and notify with
    // "conversation:created" (their personal user rooms)
    userIds: string[];
}

export interface ConversationMemberJoinedEvent {
    conversationId: string;
    userId: string;
    role: string;
}

export type ChatEventMap = {
    "conversation:created": [ConversationCreatedEvent];
    "conversation:member_joined": [ConversationMemberJoinedEvent];
};

class ChatEventEmitter extends EventEmitter {
    override on<K extends keyof ChatEventMap>(
        event: K,
        listener: (...args: ChatEventMap[K]) => void
    ): this {
        return super.on(event, listener);
    }

    override off<K extends keyof ChatEventMap>(
        event: K,
        listener: (...args: ChatEventMap[K]) => void
    ): this {
        return super.off(event, listener);
    }

    override listenerCount<K extends keyof ChatEventMap>(event: K): number {
        return super.listenerCount(event);
    }

    override emit<K extends keyof ChatEventMap>(
        event: K,
        ...args: ChatEventMap[K]
    ): boolean {
        return super.emit(event, ...args);
    }
}

export const chatEvents = new ChatEventEmitter();
