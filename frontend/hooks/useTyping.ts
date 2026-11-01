"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { socket } from "@/lib/socket";

export function useTyping(conversationId: string, currentUserId: string) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const isTypingRef = useRef(false);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const peerTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Listen for peer typing events in this conversation
  useEffect(() => {
    const handleTypingStart = ({
      conversationId: cId,
      userId,
    }: {
      conversationId: string;
      userId: string;
    }) => {
      if (cId !== conversationId || userId === currentUserId) return;

      setTypingUsers((prev) => (prev.includes(userId) ? prev : [...prev, userId]));

      // Auto-clear after 4 seconds of inactivity from this peer
      const existingTimeout = peerTimeoutsRef.current.get(userId);
      if (existingTimeout) clearTimeout(existingTimeout);

      const timeout = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((id) => id !== userId));
        peerTimeoutsRef.current.delete(userId);
      }, 4000);

      peerTimeoutsRef.current.set(userId, timeout);
    };

    const handleTypingStop = ({
      conversationId: cId,
      userId,
    }: {
      conversationId: string;
      userId: string;
    }) => {
      if (cId !== conversationId) return;

      const existingTimeout = peerTimeoutsRef.current.get(userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        peerTimeoutsRef.current.delete(userId);
      }

      setTypingUsers((prev) => prev.filter((id) => id !== userId));
    };

    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);

    return () => {
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      for (const t of peerTimeoutsRef.current.values()) clearTimeout(t);
      peerTimeoutsRef.current.clear();
      setTypingUsers([]);
    };
  }, [conversationId, currentUserId]);

  // Triggered on user keystrokes
  const handleKeystroke = useCallback(() => {
    if (!socket.connected) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing:start", { conversationId });
    }

    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
    }

    stopTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit("typing:stop", { conversationId });
    }, 2500);
  }, [conversationId]);

  // Triggered on message submit or input clear
  const stopTyping = useCallback(() => {
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      if (socket.connected) {
        socket.emit("typing:stop", { conversationId });
      }
    }
  }, [conversationId]);

  // Ensure clean teardown when navigating away
  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  return {
    typingUsers,
    handleKeystroke,
    stopTyping,
  };
}

