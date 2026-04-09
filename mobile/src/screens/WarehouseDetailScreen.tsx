import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";
import type { RouteProp } from "@react-navigation/native";
import { useRoute } from "@react-navigation/native";
import { Colors } from "../constants/colors";
import { SkeletonList } from "../components/SkeletonRow";
import { ErrorState } from "../components/ErrorState";
import { MiniLineChart } from "../components/MiniLineChart";
import { MiniBarChart } from "../components/MiniBarChart";
import api from "../services/api";
import type { DepartmentWait, ApiResponse } from "../types";

const SCREEN_W = Dimensions.get("window").width;

const DEPT_LABELS: Record<string, string> = {
  frozen: "Smrznuto",
  chilled: "Rashlađeno",
  ambient: "Ambijentalno",
  mixed: "Mješovito",
};

const DEPT_COLORS: Record<string, string> = {
  frozen: "#3b82f6",
  chilled: "#06b6d4",
  ambient: "#f59e0b",
  mixed: "#8b5cf6",
};

const DAY_LABELS = ["Ned", "Pon", "Uto", "Sri", "Čet", "Pet", "Sub"];

type RouteParams = {
  WarehouseDetail: {
    warehouseId: number;
    warehouseName: string;
    chain: string;
    currentWaitMinutes: number;
    trucksWaiting: number;
    status: string;
  };
};

interface StatsData {
  trucksWaiting: number;
  avgWaitMinutes: number;
  maxWaitMinutes: number;
  status: string;
  byDepartment: { departmentId: number; departmentName: string; trucksWaiting: number; avgWaitMinutes: number }[];
}

interface AnalyticsData {
  heatmapData: { day: number; hour: number; avgWait: number }[][];
  dailyAverages: { date: string; avgWait: number }[];
}

export function WarehouseDetailScreen() {
  const route = useRoute<RouteProp<RouteParams, "WarehouseDetail">>();
  const { warehouseId, warehouseName, chain, currentWaitMinutes, trucksWaiting, status } =
    route.params;

  const [departments, setDepartments] = useState<DepartmentWait[]>([]);
  const [hourlyData, setHourlyData] = useState<{ label: string; value: number }[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    setLoading(true);
    try {
      const [deptRes, analyticsRes] = await Promise.all([
        api.get<ApiResponse<DepartmentWait[]>>(`/warehouses/${warehouseId}/departments`),
        api.get<ApiResponse<AnalyticsData>>("/dashboard/analytics", {
          params: { warehouse_id: warehouseId, period: "7d" },
        }).catch(() => null),
      ]);

      if (deptRes.data.data) setDepartments(deptRes.data.data);

      // Build hourly chart from heatmap (today's day)
      if (analyticsRes?.data?.data?.heatmapData) {
        const today = new Date().getDay();
        const todaySlots = analyticsRes.data.data.heatmapData[today] ?? [];
        const hourly = todaySlots
          .filter((s) => s.hour >= 6 && s.hour <= 21)
          .map((s) => ({ label: `${s.hour}h`, value: s.avgWait }));
        setHourlyData(hourly);
      }

      // Build weekly chart from heatmap (avg per day)
      if (analyticsRes?.data?.data?.heatmapData) {
        const weekly = analyticsRes.data.data.heatmapData.map((daySlots, dayIdx) => {
          const vals = daySlots.filter((s) => s.avgWait > 0);
          const avg = vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v.avgWait, 0) / vals.length) : 0;
          return { label: DAY_LABELS[dayIdx], value: avg };
        });
        // Reorder Mon-Sun
        const reordered = [...weekly.slice(1), weekly[0]];
        setWeeklyData(reordered);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    load();
  }, [load]);

  const statusColor =
    status === "green" ? Colors.green : status === "yellow" ? Colors.yellow : Colors.red;
  const statusBg =
    status === "green" ? Colors.greenBg : status === "yellow" ? Colors.yellowBg : Colors.redBg;

  if (loading) return <SkeletonList count={5} />;
  if (error) return <ErrorState message="Greška pri učitavanju" onRetry={load} />;

  const chartW = SCREEN_W - 48;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <Text style={styles.name}>{warehouseName}</Text>
      <Text style={styles.chain}>{chain}</Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: statusBg }]}>
          <Text style={[styles.statValue, { color: statusColor }]}>
            {currentWaitMinutes}
          </Text>
          <Text style={styles.statLabel}>min čekanja</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{trucksWaiting}</Text>
          <Text style={styles.statLabel}>kamiona</Text>
        </View>
      </View>

      {/* Departments */}
      <Text style={styles.sectionTitle}>Čekanje po odjelu</Text>
      {departments.length === 0 ? (
        <Text style={styles.emptyText}>Nema podataka o odjelima</Text>
      ) : (
        <View style={styles.deptGrid}>
          {departments.map((dept) => {
            const color = DEPT_COLORS[dept.name] ?? Colors.primary;
            return (
              <View key={dept.id} style={styles.deptCard}>
                <View style={[styles.deptDot, { backgroundColor: color }]} />
                <Text style={styles.deptName}>
                  {DEPT_LABELS[dept.name] ?? dept.name}
                </Text>
                <Text style={[styles.deptWait, { color }]}>
                  {dept.avgWaitMinutes} min
                </Text>
                <Text style={styles.deptTrucks}>
                  {dept.trucksWaiting} kamiona
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Hourly chart */}
      {hourlyData.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Čekanje danas (po satu)</Text>
          <View style={styles.chartCard}>
            <MiniLineChart data={hourlyData} width={chartW} height={140} />
          </View>
        </>
      )}

      {/* Weekly chart */}
      {weeklyData.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Prosječno čekanje po danu</Text>
          <View style={styles.chartCard}>
            <MiniBarChart data={weeklyData} width={chartW} height={140} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  name: { fontSize: 22, fontWeight: "800", color: Colors.gray900 },
  chain: { fontSize: 14, color: Colors.gray500, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  statValue: { fontSize: 32, fontWeight: "800", color: Colors.gray900 },
  statLabel: { fontSize: 12, color: Colors.gray500, marginTop: 4 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.gray900,
    marginTop: 28,
    marginBottom: 12,
  },
  emptyText: { fontSize: 14, color: Colors.gray400 },
  deptGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  deptCard: {
    width: "47%",
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  deptDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 8 },
  deptName: { fontSize: 13, fontWeight: "600", color: Colors.gray700 },
  deptWait: { fontSize: 20, fontWeight: "800", marginTop: 4 },
  deptTrucks: { fontSize: 11, color: Colors.gray400, marginTop: 2 },
  chartCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
});
