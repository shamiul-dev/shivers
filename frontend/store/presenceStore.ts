"use client";

import { create } from "zustand";

type PresenceState = {
  onlineUserIds: Record<string, boolean>;
  setUsersOnline: (userIds: string[]) => void;
  setUserStatus: (userId: string, status: "online" | "offline") => void;
  isUserOnline: (userId?: string | null) => boolean;
};

export const usePresenceStore = create<PresenceState>()((set, get) => ({
  onlineUserIds: {},

  setUsersOnline: (userIds) =>
    set((state) => {
      const next = { ...state.onlineUserIds };
      for (const id of userIds) {
        next[id] = true;
      }
      return { onlineUserIds: next };
    }),

  setUserStatus: (userId, status) =>
    set((state) => ({
      onlineUserIds: {
        ...state.onlineUserIds,
        [userId]: status === "online",
      },
    })),

  isUserOnline: (userId) => {
    if (!userId) return false;
    return Boolean(get().onlineUserIds[userId]);
  },
}));

