import { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import type { WarehouseMapItem, ActiveCheckin } from "@/types/map";
import type { ApiResponse } from "@/types/auth";
import { useSocket } from "./useSocket";

export function useMapData() {
  const [warehouses, setWarehouses] = useState<WarehouseMapItem[]>([]);
  const [activeCheckins, setActiveCheckins] = useState<ActiveCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const { on } = useSocket();

  const fetchWarehouses = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<WarehouseMapItem[]>>(
        "/warehouses/map"
      );
      if (data.data) {
        setWarehouses(data.data);
      }
    } catch {
      // silent — map still usable
    }
  }, []);

  const fetchActiveCheckins = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<ActiveCheckin[]>>(
        "/checkins/active"
      );
      if (data.data) {
        setActiveCheckins(data.data);
      }
    } catch {
      // dispatcher-only; may 403 for drivers
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([fetchWarehouses(), fetchActiveCheckins()]);
  }, [fetchWarehouses, fetchActiveCheckins]);

  // Initial load
  useEffect(() => {
    async function load() {
      await refresh();
      setLoading(false);
    }
    load();
  }, [refresh]);

  // WebSocket real-time updates
  useEffect(() => {
    const unsub1 = on("warehouse_status_update", () => {
      fetchWarehouses();
    });
    const unsub2 = on("new_checkin", () => {
      fetchWarehouses();
      fetchActiveCheckins();
    });
    const unsub3 = on("checkin_completed", () => {
      fetchWarehouses();
      fetchActiveCheckins();
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [on, fetchWarehouses, fetchActiveCheckins]);

  return { warehouses, activeCheckins, loading, refresh };
}
