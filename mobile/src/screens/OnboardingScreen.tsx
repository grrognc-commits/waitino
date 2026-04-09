import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Dimensions,
  FlatList,
} from "react-native";
import { Colors } from "../constants/colors";
import { useAuth } from "../hooks/useAuth";
import { requestLocationPermissions } from "../services/geofence";

const { width: SCREEN_W } = Dimensions.get("window");

type AuthMode = "login" | "register";

// ── Step 1: Welcome ────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.illustrationBox}>
        <Text style={styles.illustrationIcon}>W</Text>
      </View>
      <Text style={styles.stepTitle}>
        Waitino prati čekanja{"\n"}umjesto tebe
      </Text>
      <Text style={styles.stepDescription}>
        Automatski bilježimo koliko dugo čekate na svakom skladištu.
        Bez ručnog unosa — samo se vozite.
      </Text>
      <View style={styles.bottomArea}>
        <TouchableOpacity style={styles.primaryBtn} onPress={onNext}>
          <Text style={styles.primaryBtnText}>Dalje</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Step 2: Location Permission ────────────────────────

function LocationStep({ onNext }: { onNext: () => void }) {
  const [requesting, setRequesting] = useState(false);

  async function handlePermission() {
    setRequesting(true);
    const granted = await requestLocationPermissions();
    setRequesting(false);
    if (granted) {
      onNext();
    } else {
      Alert.alert(
        "Dozvola potrebna",
        "Waitino treba pristup lokaciji 'Uvijek' kako bi automatski pratio vaš dolazak na skladište, čak i kad je aplikacija u pozadini.",
        [
          { text: "Pokušaj ponovo", onPress: handlePermission },
          { text: "Preskoči", onPress: onNext, style: "cancel" },
        ]
      );
    }
  }

  return (
    <View style={styles.stepContainer}>
      <View style={[styles.illustrationBox, { backgroundColor: Colors.blueBg }]}>
        <Text style={styles.illustrationIcon}>L</Text>
      </View>
      <Text style={styles.stepTitle}>
        Trebamo pristup{"\n"}lokaciji
      </Text>
      <Text style={styles.stepDescription}>
        Odaberite "Uvijek dopusti" kako bismo mogli automatski zabilježiti
        vaš dolazak i odlazak sa skladišta — čak i kad je ekran zaključan.
      </Text>
      <View style={styles.reasonList}>
        {[
          "Automatski check-in kad stignete na LDC",
          "Automatski check-out kad odete",
          "Radi u pozadini bez trošenja baterije",
        ].map((reason, i) => (
          <View key={i} style={styles.reasonRow}>
            <View style={styles.reasonDot} />
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        ))}
      </View>
      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={[styles.primaryBtn, requesting && styles.btnDisabled]}
          onPress={handlePermission}
          disabled={requesting}
        >
          <Text style={styles.primaryBtnText}>
            {requesting ? "Učitavanje..." : "Dopusti lokaciju"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={onNext}>
          <Text style={styles.skipBtnText}>Preskoči za sada</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Step 3: Auth ───────────────────────────────────────

function AuthStep() {
  const { login, registerDriver } = useAuth();
  const [mode, setMode] = useState<AuthMode>("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (mode === "login") {
      if (!email || !password) {
        Alert.alert("Greška", "Unesite email i lozinku");
        return;
      }
      setLoading(true);
      try {
        await login(email, password);
      } catch (err) {
        Alert.alert("Greška", err instanceof Error ? err.message : "Greška pri prijavi");
      } finally {
        setLoading(false);
      }
    } else {
      if (!email || !password || !firstName || !lastName || !phone) {
        Alert.alert("Greška", "Sva polja su obavezna");
        return;
      }
      if (password.length < 8) {
        Alert.alert("Greška", "Lozinka mora imati najmanje 8 znakova");
        return;
      }
      setLoading(true);
      try {
        await registerDriver({ email, password, firstName, lastName, phone });
      } catch (err) {
        Alert.alert("Greška", err instanceof Error ? err.message : "Greška pri registraciji");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, width: SCREEN_W }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.authScroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>
          {mode === "register" ? "Kreirajte račun" : "Prijavite se"}
        </Text>
        <Text style={styles.stepDescription}>
          {mode === "register"
            ? "Registrirajte se kao vozač za praćenje čekanja"
            : "Prijavite se sa svojm računom"}
        </Text>

        <View style={styles.formContainer}>
          {mode === "register" && (
            <>
              <View style={styles.formRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Ime"
                  placeholderTextColor={Colors.gray400}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Prezime"
                  placeholderTextColor={Colors.gray400}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Telefon"
                placeholderTextColor={Colors.gray400}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </>
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.gray400}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder={mode === "register" ? "Lozinka (min. 8 znakova)" : "Lozinka"}
            placeholderTextColor={Colors.gray400}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.primaryBtnText}>
              {loading
                ? "Učitavanje..."
                : mode === "register"
                ? "Registriraj se"
                : "Prijavi se"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => setMode(mode === "login" ? "register" : "login")}
          >
            <Text style={styles.switchBtnText}>
              {mode === "login"
                ? "Nemate račun? Registrirajte se"
                : "Već imate račun? Prijavite se"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Main ───────────────────────────────────────────────

export function OnboardingScreen() {
  const flatListRef = useRef<FlatList>(null);
  const [step, setStep] = useState(0);

  function goNext() {
    const next = step + 1;
    setStep(next);
    flatListRef.current?.scrollToIndex({ index: next, animated: true });
  }

  const steps = [
    <WelcomeStep key="welcome" onNext={goNext} />,
    <LocationStep key="location" onNext={goNext} />,
    <AuthStep key="auth" />,
  ];

  return (
    <View style={styles.screen}>
      <FlatList
        ref={flatListRef}
        data={steps}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => item}
        keyExtractor={(_, i) => String(i)}
      />
      {/* Dots */}
      <View style={styles.dots}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[styles.dot, i === step && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  stepContainer: {
    width: SCREEN_W,
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  illustrationBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 32,
  },
  illustrationIcon: {
    fontSize: 36,
    fontWeight: "800",
    color: Colors.primary,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.gray900,
    textAlign: "center",
    lineHeight: 34,
  },
  stepDescription: {
    fontSize: 15,
    color: Colors.gray500,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  reasonList: { marginTop: 24, gap: 12, paddingHorizontal: 8 },
  reasonRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  reasonDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  reasonText: { fontSize: 14, color: Colors.gray700, flex: 1 },
  bottomArea: { marginTop: 40, gap: 12 },
  primaryBtn: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
  skipBtn: { alignItems: "center", paddingVertical: 8 },
  skipBtnText: { color: Colors.gray400, fontSize: 14 },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gray300,
  },
  dotActive: { backgroundColor: Colors.primary, width: 24 },
  // Auth step
  authScroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  formContainer: { marginTop: 24, gap: 12 },
  formRow: { flexDirection: "row", gap: 12 },
  input: {
    height: 50,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.gray900,
  },
  switchBtn: { alignItems: "center", paddingVertical: 12 },
  switchBtnText: { color: Colors.primary, fontSize: 14, fontWeight: "500" },
});
