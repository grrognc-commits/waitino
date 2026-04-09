import { useEffect, useState, useMemo } from "react";
import { X, Clock, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DriverItem, CheckinHistoryItem, CheckinHistoryResponse } from "@/types/drivers";
import type { ApiResponse } from "@/types/auth";

const CARGO_LABELS: Record<string, string> = {
  frozen: "Smrznuto",
  chilled: "Rashlađeno",
  ambient: "Ambijentalno",
  mixed: "Mješovito",
};

interface Props {
  driver: DriverItem;
  onClose: () => void;
}

export function DriverDetailPanel({ driver, onClose }: Props) {
  const [history, setHistory] = useState<CheckinHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data } = await api.get<ApiResponse<CheckinHistoryResponse>>(
          "/checkins/history",
          { params: { driver_id: driver.id, limit: 10 } }
        );
        if (data.data) {
          setHistory(data.data.items);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [driver.id]);

  // KPIs from history
  const { avgWaitThisWeek, hoursLostThisMonth, dailyChart } = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const weekItems = history.filter(
      (h) => new Date(h.enteredAt) >= weekAgo && h.waitMinutes != null
    );
    const monthItems = history.filter(
      (h) => new Date(h.enteredAt) >= monthStart && h.waitMinutes != null
    );

    const avgWeek =
      weekItems.length > 0
        ? Math.round(
            weekItems.reduce((s, h) => s + (h.waitMinutes ?? 0), 0) /
              weekItems.length
          )
        : 0;

    const hoursMonth =
      Math.round(
        (monthItems.reduce((s, h) => s + (h.waitMinutes ?? 0), 0) / 60) * 10
      ) / 10;

    // Daily chart for last 7 days
    const dayMap = new Map<string, { sum: number; count: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dayMap.set(d.toISOString().slice(0, 10), { sum: 0, count: 0 });
    }
    for (const h of history) {
      const key = h.enteredAt.slice(0, 10);
      const entry = dayMap.get(key);
      if (entry && h.waitMinutes != null) {
        entry.sum += h.waitMinutes;
        entry.count += 1;
      }
    }
    const chart = Array.from(dayMap.entries()).map(([date, v]) => ({
      date: date.slice(5), // MM-DD
      avgWait: v.count > 0 ? Math.round(v.sum / v.count) : 0,
    }));

    return { avgWaitThisWeek: avgWeek, hoursLostThisMonth: hoursMonth, dailyChart: chart };
  }, [history]);

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {driver.name}
          </h3>
          <p className="text-sm text-gray-500">{driver.phone}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X size={18} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock size={14} />
              Prosjek ovaj tjedan
            </div>
            <p className="mt-1 text-xl font-bold text-gray-900">
              {avgWaitThisWeek} <span className="text-sm font-normal">min</span>
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <AlertTriangle size={14} />
              Izgubljeno ovaj mjesec
            </div>
            <p className="mt-1 text-xl font-bold text-gray-900">
              {hoursLostThisMonth} <span className="text-sm font-normal">h</span>
            </p>
          </div>
        </div>

        {/* Chart */}
        <div>
          <h4 className="mb-3 text-sm font-medium text-gray-700">
            Čekanje po danu (zadnjih 7 dana)
          </h4>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChart}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  formatter={(value) => [`${value} min`, "Prosjek"]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="avgWait"
                  fill="#1e3a5f"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* History */}
        <div>
          <h4 className="mb-3 text-sm font-medium text-gray-700">
            Zadnji check-ini
          </h4>
          {loading ? (
            <p className="text-sm text-gray-400">Učitavanje...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-400">Nema podataka</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {h.warehouseName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(h.enteredAt).toLocaleDateString("hr-HR")}{" "}
                      {new Date(h.enteredAt).toLocaleTimeString("hr-HR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">
                      {CARGO_LABELS[h.cargoType] ?? h.cargoType}
                    </Badge>
                    <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                      {h.waitMinutes ?? "—"} min
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
