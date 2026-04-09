import { useEffect, useRef, useCallback } from "react";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { useStore } from "../store";
import {
  requestLocationPermissions,
  fetchAndRegisterGeofences,
  recalculateIfNeeded,
  checkFallbackProximity,
  syncPendingEvents,
  stopGeofencing,
  handleManualFallbackConfirm,
} from "../services/geofence";

// Configure notifications for immediate display
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function useGeofencing() {
  const { isAuthenticated } = useStore();
  const started = useRef(false);
  const recalcInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Handle notification response (user taps "DA" on fallback prompt)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.action === "manual_fallback" && data.warehouseId) {
          handleManualFallbackConfirm(
            data.warehouseId as number,
            data.latitude as number,
            data.longitude as number,
            data.accuracy as number
          );
        }
      }
    );
    return () => subscription.remove();
  }, []);

  const startup = useCallback(async () => {
    if (started.current) return;

    const granted = await requestLocationPermissions();
    if (!granted) {
      console.log("[useGeofencing] Permissions not granted — skipping");
      return;
    }

    await fetchAndRegisterGeofences();
    started.current = true;

    // Sync any events that were queued while offline
    await syncPendingEvents();

    // Recalculate nearest 20 every 2 minutes
    recalcInterval.current = setInterval(async () => {
      await recalculateIfNeeded();
    }, 2 * 60 * 1000);

    // Fallback proximity check every 3 minutes
    fallbackInterval.current = setInterval(async () => {
      await checkFallbackProximity();
    }, 3 * 60 * 1000);
  }, []);

  const shutdown = useCallback(async () => {
    if (recalcInterval.current) {
      clearInterval(recalcInterval.current);
      recalcInterval.current = null;
    }
    if (fallbackInterval.current) {
      clearInterval(fallbackInterval.current);
      fallbackInterval.current = null;
    }
    if (started.current) {
      await stopGeofencing();
      started.current = false;
    }
  }, []);

  // Start/stop based on auth state
  useEffect(() => {
    if (isAuthenticated) {
      startup();
    } else {
      shutdown();
    }
    return () => {
      shutdown();
    };
  }, [isAuthenticated, startup, shutdown]);

  // Sync pending events when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && started.current) {
        syncPendingEvents();
        recalculateIfNeeded();
      }
    });
    return () => subscription.remove();
  }, []);
}
