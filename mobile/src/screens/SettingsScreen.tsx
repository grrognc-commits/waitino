import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Switch,
} from "react-native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useAuth } from "../hooks/useAuth";
import { stopGeofencing } from "../services/geofence";
import { Colors } from "../constants/colors";

export function SettingsScreen() {
  const { user, logout } = useAuth();
  const [locationStatus, setLocationStatus] = useState("Nepoznato");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const checkPermissions = useCallback(async () => {
    const { status: fgStatus } = await Location.getForegroundPermissionsAsync();
    const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
    if (bgStatus === "granted") {
      setLocationStatus("Uvijek dopušteno");
    } else if (fgStatus === "granted") {
      setLocationStatus("Samo tijekom korištenja");
    } else {
      setLocationStatus("Odbijeno");
    }

    const { status: notifStatus } = await Notifications.getPermissionsAsync();
    setNotificationsEnabled(notifStatus === "granted");
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  async function handleToggleNotifications(value: boolean) {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationsEnabled(status === "granted");
    } else {
      Alert.alert(
        "Obavijesti",
        "Za isključivanje obavijesti otvorite postavke telefona.",
        [
          { text: "Otvori postavke", onPress: () => Linking.openSettings() },
          { text: "U redu", style: "cancel" },
        ]
      );
    }
  }

  async function handleLogout() {
    Alert.alert("Odjava", "Jeste li sigurni da se želite odjaviti?", [
      { text: "Odustani", style: "cancel" },
      {
        text: "Odjavi se",
        style: "destructive",
        onPress: async () => {
          await stopGeofencing();
          await logout();
        },
      },
    ]);
  }

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "?";

  const locationOk = locationStatus === "Uvijek dopušteno";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.profileName}>
          {user ? `${user.firstName} ${user.lastName}` : "—"}
        </Text>
        <Text style={styles.profileEmail}>{user?.email ?? "—"}</Text>
        <Text style={styles.profileRole}>Vozač</Text>
      </View>

      {/* Location */}
      <Text style={styles.sectionLabel}>Lokacija</Text>
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => Linking.openSettings()}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>Lokacijske dozvole</Text>
            <Text
              style={[
                styles.settingValue,
                { color: locationOk ? Colors.green : Colors.red },
              ]}
            >
              {locationStatus}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {!locationOk && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Za automatsko praćenje dolaska na skladište potrebno je odabrati
              "Uvijek dopusti" u postavkama lokacije.
            </Text>
            <TouchableOpacity
              style={styles.warningBtn}
              onPress={() => Linking.openSettings()}
            >
              <Text style={styles.warningBtnText}>Otvori postavke</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Notifications */}
      <Text style={styles.sectionLabel}>Obavijesti</Text>
      <View style={styles.section}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Push obavijesti</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ true: Colors.primary, false: Colors.gray300 }}
            thumbColor={Colors.white}
          />
        </View>
      </View>

      {/* About */}
      <Text style={styles.sectionLabel}>O aplikaciji</Text>
      <View style={styles.section}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Verzija</Text>
          <Text style={styles.settingValue}>1.0.0</Text>
        </View>
        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.settingLabel}>Aplikacija</Text>
          <Text style={styles.settingValue}>Waitino</Text>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Odjavi se</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  profileCard: {
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.gray200,
    marginBottom: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { color: Colors.white, fontSize: 22, fontWeight: "700" },
  profileName: { fontSize: 18, fontWeight: "700", color: Colors.gray900 },
  profileEmail: { fontSize: 13, color: Colors.gray500, marginTop: 4 },
  profileRole: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: Colors.blueBg,
    borderRadius: 6,
    overflow: "hidden",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.gray400,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.gray100,
    overflow: "hidden",
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  settingLabel: { fontSize: 15, color: Colors.gray800 },
  settingValue: { fontSize: 14, color: Colors.gray400 },
  chevron: { fontSize: 20, color: Colors.gray300, fontWeight: "300" },
  warningBox: {
    backgroundColor: Colors.yellowBg,
    padding: 12,
    margin: 12,
    borderRadius: 10,
    gap: 8,
  },
  warningText: { fontSize: 13, color: Colors.gray700, lineHeight: 18 },
  warningBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  warningBtnText: { color: Colors.white, fontSize: 12, fontWeight: "600" },
  logoutBtn: {
    height: 50,
    backgroundColor: Colors.redBg,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  logoutText: { color: Colors.red, fontSize: 16, fontWeight: "600" },
});
