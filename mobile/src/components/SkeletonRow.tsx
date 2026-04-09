import { View, StyleSheet, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { Colors } from "../constants/colors";

export function SkeletonRow() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.circle} />
      <View style={styles.lines}>
        <View style={styles.lineWide} />
        <View style={styles.lineNarrow} />
      </View>
      <View style={styles.badge} />
    </Animated.View>
  );
}

export function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <View style={{ gap: 2 }}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.gray200,
  },
  lines: { flex: 1, gap: 6 },
  lineWide: {
    height: 12,
    width: "75%",
    borderRadius: 4,
    backgroundColor: Colors.gray200,
  },
  lineNarrow: {
    height: 10,
    width: "45%",
    borderRadius: 4,
    backgroundColor: Colors.gray100,
  },
  badge: {
    width: 48,
    height: 24,
    borderRadius: 8,
    backgroundColor: Colors.gray200,
  },
});
