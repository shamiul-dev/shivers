export type Attachment = {
    id: string;
    messageId?: string | null;
    conversationId: string;
    uploaderId: string;
    storageKey: string;
    thumbKey?: string | null;
    fileName: string;
    mime: string;
    sizeBytes: number;
    width?: number | null;
    height?: number | null;
    status: "pending" | "ready" | "deleted";
    createdAt: string;
    url?: string;
    thumbUrl?: string | null;
};

/**
 * MUST mirror backend/src/services/reaction.service.ts REACTION_EMOJIS.
 * The backend whitelist is the source of truth — edit both in lockstep.
 */
export const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

/** Aggregated reactions for one message, sorted count-desc (server-computed). */
export type ReactionAggregate = {
    emoji: ReactionEmoji;
    count: number;
    reactedByMe: boolean;
};

export type Message = {
    id: string;
    conversationId: string;
    senderId: string;
    type: "text" | "image" | "file";
    body: string;
    clientId: string;
    createdAt: string;
    editedAt: string | null;
    deletedAt: string | null;
    attachment?: Attachment | null;
    reactions?: ReactionAggregate[];
};

export type UserSummary = {
    id?: string;
    userId?: string;
    name: string;
    image: string | null;
    username: string | null;
    avatarKey: string | null;
};

export type Conversation = {
    id: string;
    type: "room" | "dm";
    name: string | null;
    dmKey: string | null;
    createdBy: string | null;
    createdAt: string;
    role: string;
    joinedAt: string;
    otherUser?: UserSummary | null;
    lastMessage?: {
        id: string;
        body: string;
        senderId: string;
        type: "text" | "image" | "file";
        createdAt: string;
    } | null;
    unreadCount?: number;
};

export type ChannelMember = {
    userId: string;
    name: string;
    image: string | null;
    username: string | null;
    avatarKey: string | null;
    role: "owner" | "admin" | "member";
    joinedAt: string;
};

export type SendMessageAck = 
    | { ok: true; message: Message; duplicated: boolean }
    | { ok: false; error: "unauthorized" | "rate_limited" | "validation" | "not_found" | "server"; message?: string};
