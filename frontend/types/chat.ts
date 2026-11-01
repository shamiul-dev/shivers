export type Message = {
    id: string;
    conversationId: string;
    senderId: string;
    type: "text" | "image";
    body: string;
    clientId: string;
    createdAt: string;
    editedAt: string | null;
    deletedAt: string | null;
};

export type UserSummary = {
    id: string;
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
        type: "text" | "image";
        createdAt: string;
    } | null;
    unreadCount?: number;
};

export type SendMessageAck = 
    | { ok: true; message: Message; duplicated: boolean }
    | { ok: false; error: "unauthorized" | "rate_limited" | "validation" | "not_found" | "server"; message?: string};
