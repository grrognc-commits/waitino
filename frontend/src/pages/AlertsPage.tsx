import { useState, useEffect, useCallback } from "react";
import { Bell, Settings, RefreshCw } from "lucide-react";
import api from "@/services/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertList } from "@/components/alerts/AlertList";
import { AlertSettingsPanel } from "@/components/alerts/AlertSettingsPanel";
import { RolloverSection } from "@/components/alerts/RolloverSection";
import { NewRolloverModal } from "@/components/alerts/NewRolloverModal";
import { useSocket } from "@/hooks/useSocket";
import { useAlertCount } from "@/hooks/useAlertCount";
import type { AlertItem, RolloverItem, AlertSettings } from "@/types/alerts";
import type { ApiResponse } from "@/types/auth";

type Tab = "alerts" | "rollovers" | "settings";

const DEFAULT_SETTINGS: AlertSettings = {
  longWaitThreshold: 120,
  driverStuckThreshold: 180,
  pushNotifications: false,
  emailDigest: "off",
};

export function AlertsPage() {
  const [tab, setTab] = useState<Tab>("alerts");
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [rollovers, setRollovers] = useState<RolloverItem[]>([]);
  const [settings, setSettings] = useState<AlertSettings>(() => {
    const saved = localStorage.getItem("alertSettings");
    return saved ? (JSON.parse(saved) as AlertSettings) : DEFAULT_SETTINGS;
  });
  const [showNewRollover, setShowNewRollover] = useState(false);
  const [loading, setLoading] = useState(true);
  const { on } = useSocket();

  const fetchAlerts = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<AlertItem[]>>(
        "/dashboard/alerts"
      );
      if (data.data) setAlerts(data.data);
    } catch {
      // silent
    }
  }, []);

  const fetchRollovers = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<RolloverItem[]>>(
        "/rollovers",
        { params: { resolved: "false" } }
      );
      if (data.data) setRollovers(data.data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    async function load() {
      await Promise.all([fetchAlerts(), fetchRollovers()]);
      setLoading(false);
    }
    load();
  }, [fetchAlerts, fetchRollovers]);

  // Real-time alerts
  useEffect(() => {
    const unsub = on("alert_created", () => {
      fetchAlerts();
    });
    return unsub;
  }, [on, fetchAlerts]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem("alertSettings", JSON.stringify(settings));
  }, [settings]);

  const { refresh: refreshAlertCount } = useAlertCount();

  function handleMarkRead(id: number) {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isRead: true } : a))
    );
    refreshAlertCount();
  }

  function handleRolloverResolved(id: number) {
    setRollovers((prev) => prev.filter((r) => r.id !== id));
  }

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  const tabs: { key: Tab; label: string; icon: typeof Bell; count?: number }[] =
    [
      { key: "alerts", label: "Upozorenja", icon: Bell, count: unreadCount },
      {
        key: "rollovers",
        label: "Rollover-i",
        icon: RefreshCw,
        count: rollovers.length,
      },
      { key: "settings", label: "Postavke", icon: Settings },
    ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1e3a5f] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Upozorenja</h2>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "border-[#1e3a5f] text-[#1e3a5f]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={16} />
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1e3a5f] px-1.5 text-[10px] font-bold text-white">
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {tab === "alerts" && (
        <Card>
          <CardHeader>
            <CardTitle>Sva upozorenja</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertList alerts={alerts} onMarkRead={handleMarkRead} />
          </CardContent>
        </Card>
      )}

      {tab === "rollovers" && (
        <Card>
          <CardContent className="pt-6">
            <RolloverSection
              rollovers={rollovers}
              onResolved={handleRolloverResolved}
              onNewClick={() => setShowNewRollover(true)}
            />
          </CardContent>
        </Card>
      )}

      {tab === "settings" && (
        <Card>
          <CardHeader>
            <CardTitle>Postavke upozorenja</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertSettingsPanel
              settings={settings}
              onChange={setSettings}
            />
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      {showNewRollover && (
        <NewRolloverModal
          onClose={() => setShowNewRollover(false)}
          onCreated={() => {
            setShowNewRollover(false);
            fetchRollovers();
            fetchAlerts();
          }}
        />
      )}
    </div>
  );
}
