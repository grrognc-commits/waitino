import { Clock, UserX, RefreshCw, TrendingUp } from "lucide-react";
import api from "@/services/api";
import type { AlertItem } from "@/types/alerts";

const ALERT_CONFIG: Record<
  string,
  { icon: typeof Clock; color: string; bg: string; label: string }
> = {
  long_wait: {
    icon: Clock,
    color: "text-red-600",
    bg: "bg-red-50",
    label: "Dugo čekanje",
  },
  driver_stuck: {
    icon: UserX,
    color: "text-amber-600",
    bg: "bg-amber-50",
    label: "Vozač zaglavljen",
  },
  rollover: {
    icon: RefreshCw,
    color: "text-blue-600",
    bg: "bg-blue-50",
    label: "Rollover",
  },
  capacity_spike: {
    icon: TrendingUp,
    color: "text-violet-600",
    bg: "bg-violet-50",
    label: "Kapacitet",
  },
};

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "upravo";
  if (diffMin < 60) return `prije ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `prije ${diffH}h`;
  return d.toLocaleDateString("hr-HR");
}

interface Props {
  alerts: AlertItem[];
  onMarkRead: (id: number) => void;
}

export function AlertList({ alerts, onMarkRead }: Props) {
  async function handleClick(alert: AlertItem) {
    if (alert.isRead) return;
    try {
      await api.patch(`/dashboard/alerts/${alert.id}/read`);
      onMarkRead(alert.id);
    } catch {
      // silent
    }
  }

  if (alerts.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        Nema nepročitanih upozorenja
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const config = ALERT_CONFIG[alert.alertType] ?? ALERT_CONFIG.long_wait;
        const Icon = config.icon;

        return (
          <button
            key={alert.id}
            onClick={() => handleClick(alert)}
            className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
              alert.isRead
                ? "border-gray-100 bg-white"
                : "border-gray-200 bg-gray-50/80 hover:bg-white"
            }`}
          >
            <div
              className={`mt-0.5 flex-shrink-0 rounded-lg p-2 ${config.bg}`}
            >
              <Icon size={16} className={config.color} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-medium ${config.color}`}
                >
                  {config.label}
                </span>
                {!alert.isRead && (
                  <span className="h-2 w-2 rounded-full bg-[#1e3a5f]" />
                )}
              </div>
              <p
                className={`mt-0.5 text-sm ${
                  alert.isRead
                    ? "text-gray-500"
                    : "font-medium text-gray-900"
                }`}
              >
                {alert.message}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {formatTime(alert.createdAt)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
