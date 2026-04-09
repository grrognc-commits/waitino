import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Clock,
  Building2,
  CalendarClock,
  AlertTriangle,
} from "lucide-react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";
import { WaitHeatmap } from "@/components/analytics/WaitHeatmap";
import type {
  AnalyticsData,
  WarehouseOption,
} from "@/types/analytics";
import type { ApiResponse } from "@/types/auth";

const DAY_FULL = [
  "Nedjelja",
  "Ponedjeljak",
  "Utorak",
  "Srijeda",
  "Četvrtak",
  "Petak",
  "Subota",
];

const CHAIN_COLORS: Record<string, string> = {
  kaufland: "#e2001a",
  lidl: "#0050aa",
  plodine: "#e3000b",
  spar: "#00843d",
  konzum: "#d40000",
  tommy: "#ee3124",
  studenac: "#005baa",
  metro: "#003882",
  other: "#6b7280",
};

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [warehouseId, setWarehouseId] = useState("");
  const [chain, setChain] = useState("");
  const [period, setPeriod] = useState("7d");

  // Fetch warehouse list for filters
  useEffect(() => {
    api
      .get<ApiResponse<WarehouseOption[]>>("/warehouses")
      .then(({ data: res }) => {
        if (res.data) setWarehouses(res.data);
      })
      .catch(() => {});
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { period };
      if (warehouseId) params.warehouse_id = warehouseId;
      const { data: res } = await api.get<ApiResponse<AnalyticsData>>(
        "/dashboard/analytics",
        { params }
      );
      if (res.data) setData(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [period, warehouseId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // KPIs derived from data
  const kpis = useMemo(() => {
    if (!data) return null;

    const avgWait =
      data.dailyAverages.length > 0
        ? Math.round(
            data.dailyAverages.reduce((s, d) => s + d.avgWait, 0) /
              data.dailyAverages.length
          )
        : 0;

    const worstWarehouse =
      data.worstWarehouses.length > 0
        ? data.worstWarehouses[0]
        : null;

    // Find worst day/hour from heatmap
    let worstDay = 0;
    let worstHour = 0;
    let worstVal = 0;
    for (const daySlots of data.heatmapData) {
      for (const cell of daySlots) {
        if (cell.avgWait > worstVal) {
          worstVal = cell.avgWait;
          worstDay = cell.day;
          worstHour = cell.hour;
        }
      }
    }

    return {
      avgWait,
      worstWarehouse,
      worstDayHour:
        worstVal > 0
          ? `${DAY_FULL[worstDay]} ${worstHour}:00`
          : "—",
      worstDayHourVal: worstVal,
      totalHoursLost: data.totalHoursLost,
      totalCheckins: data.totalCheckins,
    };
  }, [data]);

  // Enrich worst warehouses with chain color
  const barData = useMemo(() => {
    if (!data) return [];
    return data.worstWarehouses.map((wh) => {
      const whInfo = warehouses.find((w) => w.id === wh.warehouseId);
      return {
        ...wh,
        chain: whInfo?.chain ?? "other",
        fill: CHAIN_COLORS[whInfo?.chain ?? "other"] ?? CHAIN_COLORS.other,
      };
    });
  }, [data, warehouses]);

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1e3a5f] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Analitika</h2>
        <AnalyticsFilters
          warehouses={warehouses}
          warehouseId={warehouseId}
          chain={chain}
          period={period}
          onWarehouseChange={setWarehouseId}
          onChainChange={setChain}
          onPeriodChange={setPeriod}
        />
      </div>

      {/* KPI cards */}
      {kpis && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-violet-50 p-2">
                <Clock size={20} className="text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {kpis.avgWait}{" "}
                  <span className="text-sm font-normal">min</span>
                </p>
                <p className="text-xs text-gray-500">Prosječno čekanje</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-red-50 p-2">
                <Building2 size={20} className="text-red-600" />
              </div>
              <div>
                <p
                  className="text-sm font-bold text-gray-900 truncate max-w-[140px]"
                  title={kpis.worstWarehouse?.name}
                >
                  {kpis.worstWarehouse?.name ?? "—"}
                </p>
                <p className="text-xs text-gray-500">
                  Najgori LDC ({kpis.worstWarehouse?.avgWait ?? 0} min)
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-amber-50 p-2">
                <CalendarClock size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {kpis.worstDayHour}
                </p>
                <p className="text-xs text-gray-500">
                  Najgori termin ({kpis.worstDayHourVal} min)
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-red-50 p-2">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {kpis.totalHoursLost}{" "}
                  <span className="text-sm font-normal">h</span>
                </p>
                <p className="text-xs text-gray-500">Ukupno izgubljeno</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Heatmap */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>
              Heatmapa čekanja
            </CardTitle>
            <p className="text-sm text-gray-500">
              Prosječno čekanje po satu i danu — pronađite obrasce kada izbjegavati slanje kamiona
            </p>
          </CardHeader>
          <CardContent>
            <WaitHeatmap data={data.heatmapData} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar chart: worst warehouses */}
        {barData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Najduže čekanje po LDC-u</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barData}
                    layout="vertical"
                    margin={{ left: 0, right: 16 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#f3f4f6"
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={140}
                    />
                    <Tooltip
                      formatter={(value) => [
                        `${value} min`,
                        "Prosječno čekanje",
                      ]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="avgWait" radius={[0, 4, 4, 0]} maxBarSize={24}>
                      {barData.map((entry) => (
                        <rect key={entry.warehouseId} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Line chart: daily trend */}
        {data && data.dailyAverages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Trend čekanja</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.dailyAverages}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f3f4f6"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: string) => v.slice(5)}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                    />
                    <Tooltip
                      formatter={(value) => [
                        `${value} min`,
                        "Prosječno čekanje",
                      ]}
                      labelFormatter={(label) =>
                        new Date(String(label)).toLocaleDateString("hr-HR")
                      }
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgWait"
                      stroke="#1e3a5f"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#1e3a5f" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
