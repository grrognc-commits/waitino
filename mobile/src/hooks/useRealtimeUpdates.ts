import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { io, Socket } from "socket.io-client";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../constants/config";
import { useStore } from "../store";

// Socket.IO server URL (strip /api suffix)
const SOCKET_URL = API_BASE_URL.replace("/api", "");

export function useRealtimeUpdates() {
  const socketRef = useRef<Socket | null>(null);
  const {
    isAuthenticated,
    fetchWarehouses,
    fetchMyStatus,
  } = useStore();

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    async function connect() {
      const token = await SecureStore.getItemAsync("token");

      const socket = io(SOCKET_URL, {
        auth: { token: token ?? undefined },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 15000,
      });

      socket.on("connect", () => {
        console.log("[Socket] Connected");
      });

      socket.on("disconnect", () => {
        console.log("[Socket] Disconnected");
      });

      // Warehouse status changed — refresh list
      socket.on("warehouse_status_update", () => {
        fetchWarehouses();
      });

      // New checkin — could be our driver or someone else
      socket.on("new_checkin", () => {
        fetchWarehouses();
        fetchMyStatus();
      });

      // Checkin completed
      socket.on("checkin_completed", () => {
        fetchWarehouses();
        fetchMyStatus();
      });

      // Alert created — show push notification when app is in background
      socket.on("alert_created", (data: { alertType: string; message: string; warehouseName?: string }) => {
        const appState = AppState.currentState;
        if (appState !== "active") {
          Notifications.scheduleNotificationAsync({
            content: {
              title: "Waitino upozorenje",
              body: data.message,
              data: { type: "alert" },
            },
            trigger: null,
          });
        }
      });

      socketRef.current = socket;
    }

    connect();

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, fetchWarehouses, fetchMyStatus]);

  // Reconnect when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && socketRef.current?.disconnected) {
        socketRef.current.connect();
      }
    });
    return () => subscription.remove();
  }, []);
}
