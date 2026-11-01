"use client";

import { useEffect } from "react";
import { socket } from "@/lib/socket";

export function SocketManager({ sessionToken }: { sessionToken?: string }) {
  useEffect(() => {
    if (!sessionToken) return;

    const currentToken = (socket.auth as { token?: string } | undefined)?.token;
    if (currentToken && currentToken !== sessionToken && socket.connected) {
      socket.disconnect();
    }

    socket.auth = { token: sessionToken };

    if (!socket.connected) {
      socket.connect();
    }
  }, [sessionToken]);

  return null;
}

