import { useEffect, useRef, useCallback, useState } from "react";
import { io, type Socket } from "socket.io-client";

type EventHandler = (...args: unknown[]) => void;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket = io("/", {
      auth: { token: token ?? undefined },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, []);

  const on = useCallback((event: string, handler: EventHandler) => {
    socketRef.current?.on(event, handler);
    return () => {
      socketRef.current?.off(event, handler);
    };
  }, []);

  const joinWarehouse = useCallback((warehouseId: number) => {
    socketRef.current?.emit("join_warehouse", warehouseId);
  }, []);

  const leaveWarehouse = useCallback((warehouseId: number) => {
    socketRef.current?.emit("leave_warehouse", warehouseId);
  }, []);

  return { on, connected, joinWarehouse, leaveWarehouse };
}
