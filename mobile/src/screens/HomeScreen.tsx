import { useEffect, useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useStore } from "../store";
import { Colors } from "../constants/colors";
import { SkeletonList } from "../components/SkeletonRow";
import { ErrorState } from "../components/ErrorState";
import type { WarehouseMapItem } from "../types";

const STATUS_COLORS: Record<string, string> = {
  green: Colors.green,
  yellow: Colors.yellow,
  red: Colors.red,
};

const STATUS_BG: Record<string, string> = {
  green: Colors.greenBg,
  yellow: Colors.yellowBg,
  red: Colors.redBg,
};

const CHAIN_LABELS: Record<string, string> = {
  kaufland: "Kaufland",
  lidl: "Lidl",
  plodine: "Plodine",
  spar: "Spar",
  konzum: "Konzum",
  tommy: "Tommy",
  studenac: "Studenac",
  metro: "Metro",
  other: "Ostalo",
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object>>>();
  const {
    warehouses,
    activeCheckin,
    fetchWarehouses,
    updateUserLocation,
    userLat,
    userLng,
  } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      await Promise.all([fetchWarehouses(), updateUserLocation()]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [fetchWarehouses, updateUserLocation]);

  useEffect(() => {
    load();
    const interval = setInterval(fetchWarehouses, 30_000);
    return () => clearInterval(interval);
  }, [load, fetchWarehouses]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchWarehouses(), updateUserLocation()]);
    setRefreshing(false);
  }, [fetchWarehouses, updateUserLocation]);

  // Sort by distance from user
  const sorted = useMemo(() => {
    if (userLat == null || userLng == null) {
      return warehouses.slice().sort((a, b) => b.currentWaitMinutes - a.currentWaitMinutes);
    }
    return warehouses
      .map((w) => ({
        ...w,
        distance: haversineKm(userLat, userLng, w.lat, w.lng),
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [warehouses, userLat, userLng]);

  function handleTap(wh: WarehouseMapItem & { distance?: number }) {
    navigation.navigate("WarehouseDetail", {
      warehouseId: wh.id,
      warehouseName: wh.name,
      chain: CHAIN_LABELS[wh.chain] ?? wh.chain,
      currentWaitMinutes: wh.currentWaitMinutes,
      trucksWaiting: wh.trucksWaiting,
      status: wh.status,
    });
  }

  if (loading) return <SkeletonList count={8} />;
  if (error) return <ErrorState message="Greška pri učitavanju skladišta" onRetry={load} />;

  return (
    <View style={styles.container}>
      {/* Active checkin banner */}
      {activeCheckin && (
        <View style={styles.banner}>
          <View style={styles.bannerLeft}>
            <View style={[styles.bannerDot, { backgroundColor: Colors.yellow }]} />
            <View>
              <Text style={styles.bannerLabel}>Čekate na</Text>
              <Text style={styles.bannerName}>{activeCheckin.warehouseName}</Text>
            </View>
          </View>
          <Text style={styles.bannerWait}>{activeCheckin.waitMinutes} min</Text>
        </View>
      )}

      <FlatList
        data={sorted}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const statusColor = STATUS_COLORS[item.status] ?? Colors.green;
          const statusBg = STATUS_BG[item.status] ?? Colors.greenBg;

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleTap(item)}
              activeOpacity={0.7}
            >
              {/* Chain badge */}
              <View style={styles.chainBadge}>
                <Text style={styles.chainLetter}>
                  {(CHAIN_LABELS[item.chain] ?? "?")[0]}
                </Text>
              </View>

              {/* Info */}
              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.cardMeta}>
                  {CHAIN_LABELS[item.chain] ?? item.chain}
                  {"distance" in item
                    ? ` · ${formatDistance((item as { distance: number }).distance)}`
                    : ""}
                </Text>
              </View>

              {/* Wait badge */}
              <View style={[styles.waitBadge, { backgroundColor: statusBg }]}>
                <Text style={[styles.waitText, { color: statusColor }]}>
                  {item.currentWaitMinutes} min
                </Text>
                <Text style={styles.truckCount}>{item.trucksWaiting} kam.</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nema dostupnih skladišta</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 12, gap: 6 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primary,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
  },
  bannerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  bannerDot: { width: 10, height: 10, borderRadius: 5 },
  bannerLabel: { fontSize: 11, color: Colors.gray300 },
  bannerName: { fontSize: 15, fontWeight: "700", color: Colors.white },
  bannerWait: { fontSize: 22, fontWeight: "800", color: Colors.white },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  chainBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  chainLetter: { fontSize: 18, fontWeight: "800", color: Colors.primary },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: "600", color: Colors.gray900 },
  cardMeta: { fontSize: 12, color: Colors.gray400, marginTop: 2 },
  waitBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: "center",
    minWidth: 60,
  },
  waitText: { fontSize: 14, fontWeight: "700" },
  truckCount: { fontSize: 10, color: Colors.gray500, marginTop: 1 },
  emptyContainer: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 14, color: Colors.gray400 },
});
