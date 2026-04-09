import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import api from "@/services/api";
import { useSocket } from "./useSocket";
import type { ApiResponse } from "@/types/auth";

interface AlertCountContextValue {
  unreadCount: number;
  increment: () => void;
  refresh: () => void;
}

const AlertCountContext = createContext<AlertCountContextValue>({
  unreadCount: 0,
  increment: () => {},
  refresh: () => {},
});

export function AlertCountProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { on } = useSocket();

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get<
        ApiResponse<{ id: number }[]>
      >("/dashboard/alerts");
      if (data.data) {
        setUnreadCount(data.data.length);
      }
    } catch {
      // silent
    }
  }, []);

  const increment = useCallback(() => {
    setUnreadCount((c) => c + 1);
  }, []);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for real-time alerts
  useEffect(() => {
    const unsub = on("alert_created", () => {
      increment();
    });
    return unsub;
  }, [on, increment]);

  return (
    <AlertCountContext.Provider value={{ unreadCount, increment, refresh }}>
      {children}
    </AlertCountContext.Provider>
  );
}

export function useAlertCount() {
  return useContext(AlertCountContext);
}
