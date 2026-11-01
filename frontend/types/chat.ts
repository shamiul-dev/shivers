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
