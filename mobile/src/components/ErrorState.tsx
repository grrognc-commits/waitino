import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Colors } from "../constants/colors";

interface Props {
  message?: string;
  onRetry: () => void;
}

export function ErrorState({
  message = "Nešto je pošlo krivo",
  onRetry,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>!</Text>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>Pokušaj ponovo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emoji: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.gray300,
    width: 56,
    height: 56,
    lineHeight: 56,
    textAlign: "center",
    borderRadius: 28,
    backgroundColor: Colors.gray100,
    marginBottom: 16,
  },
  message: {
    fontSize: 15,
    color: Colors.gray500,
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
});
