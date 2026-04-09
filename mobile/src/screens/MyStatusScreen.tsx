import { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useStore } from "../store";
import type { CheckinHistoryItem } from "../store";
import { Colors } from "../constants/colors";
import { SkeletonList } from "../components/SkeletonRow";
import { ErrorState } from "../components/ErrorState";
import { formatTime, formatDateTime, useTimeFormat } from "../utils/dateFormat";

const CARGO_LABELS: Record<string, string> = {
  frozen: "Smrznuto",
  chilled: "Rashlađeno",
  ambient: "Ambijentalno",
  mixed: "Mješovito",
};

function LiveTimer({ enteredAt }: { enteredAt: string }) {
  const [minutes, setMinutes] = useState(() =>
    Math.floor((Date.now() - new Date(enteredAt).getTime()) / 60000)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setMinutes(Math.floor((Date.now() - new Date(enteredAt).getTime()) / 60000));
    }, 10_000);
    return () => clearInterval(timer);
  }, [enteredAt]);

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return (
    <View style={styles.timerRow}>
      {hours > 0 && (
        <>
          <Text style={styles.timerValue}>{hours}</Text>
          <Text style={styles.timerUnit}>h</Text>
        </>
      )}
      <Text style={styles.timerValue}>{mins}</Text>
      <Text style={styles.timerUnit}>min</Text>
    </View>
  );
}

function CheckinItem({ item, tf }: { item: CheckinHistoryItem; tf: "24h" | "12h" }) {
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyLeft}>
        <Text style={styles.historyName} numberOfLines={1}>
          {item.warehouseName}
        </Text>
        <Text style={styles.historyMeta}>
          {formatDateTime(item.enteredAt, tf)}
          {" · "}
          {CARGO_LABELS[item.cargoType] ?? item.cargoType}
        </Text>
      </View>
      <View style={styles.historyRight}>
        <Text style={styles.historyWait}>
          {item.waitMinutes != null ? `${item.waitMinutes} min` : "—"}
        </Text>
      </View>
    </View>
  );
}

export function MyStatusScreen() {
  const tf = useTimeFormat();
  const { activeCheckin, fetchMyStatus, fetchRecentCheckins, recentCheckins, user } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      await Promise.all([fetchMyStatus(), fetchRecentCheckins()]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [fetchMyStatus, fetchRecentCheckins]);

  useEffect(() => {
    load();
    const interval = setInterval(fetchMyStatus, 15_000);
    return () => clearInterval(interval);
  }, [load, fetchMyStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchMyStatus(), fetchRecentCheckins()]);
    setRefreshing(false);
  }, [fetchMyStatus, fetchRecentCheckins]);

  if (loading) return <SkeletonList count={4} />;
  if (error) return <ErrorState message="Greška pri učitavanju statusa" onRetry={load} />;

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "?";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }
    >
      {/* User card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>
            {user ? `${user.firstName} ${user.lastName}` : "Vozač"}
          </Text>
          <Text style={styles.userRole}>Vozač</Text>
        </View>
      </View>

      {/* Status */}
      <Text style={styles.sectionTitle}>Trenutni status</Text>

      {activeCheckin ? (
        <View style={styles.activeCard}>
          <View style={styles.activeHeader}>
            <View style={[styles.statusDot, { backgroundColor: Colors.yellow }]} />
            <Text style={styles.activeLabel}>Čekate na skladištu</Text>
          </View>

          <Text style={styles.activeName}>{activeCheckin.warehouseName}</Text>

          <LiveTimer enteredAt={activeCheckin.enteredAt} />

          <Text style={styles.activeSince}>
            Od {formatTime(activeCheckin.enteredAt, tf)}
          </Text>

          {/* Cargo type */}
          <View style={styles.cargoRow}>
            <Text style={styles.cargoLabel}>Vrsta robe:</Text>
            <View style={styles.cargoBadge}>
              <Text style={styles.cargoText}>
                {CARGO_LABELS[activeCheckin.cargoType] ?? activeCheckin.cargoType}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.idleCard}>
          <View style={[styles.statusDot, { backgroundColor: Colors.green }]} />
          <Text style={styles.idleText}>
            Niste trenutno na nijednom skladištu
          </Text>
        </View>
      )}

      {/* Recent checkins */}
      <Text style={styles.sectionTitle}>Zadnji check-ini</Text>
      {recentCheckins.length === 0 ? (
        <Text style={styles.emptyText}>Još nema zabilježenih posjeta</Text>
      ) : (
        <View style={styles.historyList}>
          {recentCheckins.map((item) => (
            <CheckinItem key={item.id} item={item} tf={tf} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: Colors.white, fontSize: 17, fontWeight: "700" },
  userName: { fontSize: 18, fontWeight: "700", color: Colors.gray900 },
  userRole: { fontSize: 13, color: Colors.gray500, marginTop: 2 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.gray900,
    marginBottom: 12,
  },
  activeCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.gray200,
    marginBottom: 24,
  },
  activeHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  activeLabel: { fontSize: 13, fontWeight: "600", color: Colors.yellow },
  activeName: { fontSize: 20, fontWeight: "800", color: Colors.gray900, marginTop: 12 },
  timerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 8,
    gap: 2,
  },
  timerValue: { fontSize: 48, fontWeight: "800", color: Colors.primary },
  timerUnit: { fontSize: 18, fontWeight: "500", color: Colors.gray400 },
  activeSince: { fontSize: 13, color: Colors.gray400, marginTop: 4 },
  cargoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  cargoLabel: { fontSize: 13, color: Colors.gray500 },
  cargoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.gray100,
  },
  cargoText: { fontSize: 13, fontWeight: "600", color: Colors.gray700 },
  idleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.greenBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  idleText: { fontSize: 14, color: Colors.gray700, flex: 1 },
  emptyText: { fontSize: 14, color: Colors.gray400 },
  historyList: { gap: 6 },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  historyLeft: { flex: 1 },
  historyName: { fontSize: 14, fontWeight: "600", color: Colors.gray800 },
  historyMeta: { fontSize: 12, color: Colors.gray400, marginTop: 2 },
  historyRight: { marginLeft: 12 },
  historyWait: { fontSize: 15, fontWeight: "700", color: Colors.primary },
});
