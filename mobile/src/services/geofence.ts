import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";
import type { GeofenceRegion, PendingGeofenceEvent, ApiResponse } from "../types";
import {
  GEOFENCE_TASK_NAME,
  MAX_GEOFENCE_REGIONS,
  MIN_DWELL_MS,
  PENDING_EVENTS_KEY,
  ENTER_TIMESTAMPS_KEY,
} from "../constants/config";

// ── Haversine distance (meters) ────────────────────────

function haversineM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Offline event queue ────────────────────────────────

async function enqueueEvent(event: PendingGeofenceEvent): Promise<void> {
  const raw = await AsyncStorage.getItem(PENDING_EVENTS_KEY);
  const queue: PendingGeofenceEvent[] = raw ? JSON.parse(raw) : [];
  queue.push(event);
  await AsyncStorage.setItem(PENDING_EVENTS_KEY, JSON.stringify(queue));
  console.log(`[Geofence] Queued offline ${event.type} for warehouse ${event.warehouseId}`);
}

export async function syncPendingEvents(): Promise<void> {
  const raw = await AsyncStorage.getItem(PENDING_EVENTS_KEY);
  if (!raw) return;

  const queue: PendingGeofenceEvent[] = JSON.parse(raw);
  if (queue.length === 0) return;

  console.log(`[Geofence] Syncing ${queue.length} pending events...`);
  const remaining: PendingGeofenceEvent[] = [];

  for (const event of queue) {
    try {
      const endpoint = event.type === "enter" ? "/checkins/enter" : "/checkins/exit";
      await api.post(endpoint, {
        warehouse_id: event.warehouseId,
        latitude: event.latitude,
        longitude: event.longitude,
        accuracy_meters: event.accuracyMeters,
      });
      console.log(`[Geofence] Synced ${event.type} for warehouse ${event.warehouseId}`);
    } catch {
      remaining.push(event);
    }
  }

  await AsyncStorage.setItem(PENDING_EVENTS_KEY, JSON.stringify(remaining));
}

// ── Enter timestamp tracking (dwell filter) ────────────

async function recordEnterTimestamp(warehouseId: number): Promise<void> {
  const raw = await AsyncStorage.getItem(ENTER_TIMESTAMPS_KEY);
  const map: Record<string, number> = raw ? JSON.parse(raw) : {};
  map[String(warehouseId)] = Date.now();
  await AsyncStorage.setItem(ENTER_TIMESTAMPS_KEY, JSON.stringify(map));
}

async function getEnterTimestamp(warehouseId: number): Promise<number | null> {
  const raw = await AsyncStorage.getItem(ENTER_TIMESTAMPS_KEY);
  if (!raw) return null;
  const map: Record<string, number> = JSON.parse(raw);
  return map[String(warehouseId)] ?? null;
}

async function clearEnterTimestamp(warehouseId: number): Promise<void> {
  const raw = await AsyncStorage.getItem(ENTER_TIMESTAMPS_KEY);
  if (!raw) return;
  const map: Record<string, number> = JSON.parse(raw);
  delete map[String(warehouseId)];
  await AsyncStorage.setItem(ENTER_TIMESTAMPS_KEY, JSON.stringify(map));
}

// ── Background task definition ─────────────────────────

interface GeofenceTaskData {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}

TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("[Geofence] Task error:", error.message);
    return;
  }

  const { eventType, region } = data as GeofenceTaskData;
  if (!region.identifier) return;

  const warehouseId = parseInt(region.identifier, 10);
  if (isNaN(warehouseId)) return;

  let location: Location.LocationObject;
  try {
    location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
  } catch {
    console.error("[Geofence] Could not get location");
    return;
  }

  const lat = location.coords.latitude;
  const lng = location.coords.longitude;
  const acc = location.coords.accuracy ?? 10;

  if (eventType === Location.GeofencingEventType.Enter) {
    console.log(`[Geofence] ENTER warehouse ${warehouseId} at (${lat}, ${lng}) acc=${acc}m`);

    await recordEnterTimestamp(warehouseId);

    try {
      await api.post("/checkins/enter", {
        warehouse_id: warehouseId,
        latitude: lat,
        longitude: lng,
        accuracy_meters: acc,
      });
      console.log(`[Geofence] Enter API call succeeded for warehouse ${warehouseId}`);
    } catch {
      console.log(`[Geofence] Enter API failed — queuing offline for warehouse ${warehouseId}`);
      await enqueueEvent({
        warehouseId,
        warehouseName: `Warehouse ${warehouseId}`,
        type: "enter",
        latitude: lat,
        longitude: lng,
        accuracyMeters: acc,
        timestamp: Date.now(),
      });
    }
  } else if (eventType === Location.GeofencingEventType.Exit) {
    console.log(`[Geofence] EXIT warehouse ${warehouseId} at (${lat}, ${lng}) acc=${acc}m`);

    // Dwell time check: ignore if under MIN_DWELL_MS
    const enterTs = await getEnterTimestamp(warehouseId);
    if (enterTs != null) {
      const dwellMs = Date.now() - enterTs;
      if (dwellMs < MIN_DWELL_MS) {
        console.log(
          `[Geofence] Ignoring exit — dwell ${Math.round(dwellMs / 1000)}s < 5 min (pass-through)`
        );
        await clearEnterTimestamp(warehouseId);
        return;
      }
    }
    await clearEnterTimestamp(warehouseId);

    try {
      await api.post("/checkins/exit", {
        warehouse_id: warehouseId,
        latitude: lat,
        longitude: lng,
        accuracy_meters: acc,
      });
      console.log(`[Geofence] Exit API call succeeded for warehouse ${warehouseId}`);
    } catch {
      console.log(`[Geofence] Exit API failed — queuing offline for warehouse ${warehouseId}`);
      await enqueueEvent({
        warehouseId,
        warehouseName: `Warehouse ${warehouseId}`,
        type: "exit",
        latitude: lat,
        longitude: lng,
        accuracyMeters: acc,
        timestamp: Date.now(),
      });
    }
  }

  // Try syncing any pending events while we're active
  await syncPendingEvents();
});

// ── Permissions ────────────────────────────────────────

export async function requestLocationPermissions(): Promise<boolean> {
  const { status: foreground } =
    await Location.requestForegroundPermissionsAsync();
  if (foreground !== "granted") {
    console.log("[Geofence] Foreground location permission denied");
    return false;
  }

  const { status: background } =
    await Location.requestBackgroundPermissionsAsync();
  if (background !== "granted") {
    console.log("[Geofence] Background location permission denied");
    return false;
  }

  console.log("[Geofence] All location permissions granted");
  return true;
}

// ── Nearest-N region selection ─────────────────────────

function selectNearestRegions(
  regions: GeofenceRegion[],
  userLat: number,
  userLng: number,
  maxCount: number
): GeofenceRegion[] {
  const withDistance = regions.map((r) => ({
    region: r,
    distance: haversineM(userLat, userLng, r.gateLatitude, r.gateLongitude),
  }));
  withDistance.sort((a, b) => a.distance - b.distance);
  return withDistance.slice(0, maxCount).map((w) => w.region);
}

// ── Fetch regions from API + register geofences ────────

let lastCalcLat = 0;
let lastCalcLng = 0;
let allRegions: GeofenceRegion[] = [];

export async function fetchAndRegisterGeofences(): Promise<void> {
  // 1. Fetch all warehouse geofence regions from API
  try {
    const { data } = await api.get<ApiResponse<GeofenceRegion[]>>(
      "/warehouses/geofences"
    );
    if (data.data) {
      allRegions = data.data;
      console.log(`[Geofence] Fetched ${allRegions.length} warehouse regions`);
    }
  } catch (err) {
    console.error("[Geofence] Failed to fetch regions:", err);
    return;
  }

  if (allRegions.length === 0) return;

  // 2. Get current user location
  let userLocation: Location.LocationObject;
  try {
    userLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
  } catch {
    console.error("[Geofence] Could not get user location for nearest calc");
    // Fallback: register first N alphabetically
    const fallback = allRegions.slice(0, MAX_GEOFENCE_REGIONS);
    await registerRegions(fallback);
    return;
  }

  const userLat = userLocation.coords.latitude;
  const userLng = userLocation.coords.longitude;

  lastCalcLat = userLat;
  lastCalcLng = userLng;

  // 3. Select nearest MAX_GEOFENCE_REGIONS
  const nearest = selectNearestRegions(
    allRegions,
    userLat,
    userLng,
    MAX_GEOFENCE_REGIONS
  );

  console.log(
    `[Geofence] Registering ${nearest.length} nearest regions (of ${allRegions.length} total)`
  );

  await registerRegions(nearest);
}

async function registerRegions(regions: GeofenceRegion[]): Promise<void> {
  const locationRegions: Location.LocationRegion[] = regions.map((r) => ({
    identifier: String(r.id),
    latitude: r.gateLatitude,
    longitude: r.gateLongitude,
    radius: r.geofenceRadius,
    notifyOnEnter: true,
    notifyOnExit: true,
  }));

  await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, locationRegions);
  console.log(`[Geofence] Registered ${locationRegions.length} geofence regions`);
}

// ── Recalculate nearest if driver moved >5km ───────────

export async function recalculateIfNeeded(): Promise<boolean> {
  if (allRegions.length === 0) return false;

  let userLocation: Location.LocationObject;
  try {
    userLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
  } catch {
    return false;
  }

  const userLat = userLocation.coords.latitude;
  const userLng = userLocation.coords.longitude;
  const moved = haversineM(lastCalcLat, lastCalcLng, userLat, userLng);

  if (moved < 5000) return false;

  console.log(
    `[Geofence] Driver moved ${Math.round(moved)}m — recalculating nearest regions`
  );

  lastCalcLat = userLat;
  lastCalcLng = userLng;

  const nearest = selectNearestRegions(
    allRegions,
    userLat,
    userLng,
    MAX_GEOFENCE_REGIONS
  );

  await registerRegions(nearest);
  return true;
}

// ── Manual fallback check ──────────────────────────────

export async function checkFallbackProximity(): Promise<void> {
  if (allRegions.length === 0) return;

  let userLocation: Location.LocationObject;
  try {
    userLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
  } catch {
    return;
  }

  const lat = userLocation.coords.latitude;
  const lng = userLocation.coords.longitude;

  for (const region of allRegions) {
    const dist = haversineM(lat, lng, region.gateLatitude, region.gateLongitude);

    if (dist <= region.geofenceRadius) {
      // Check if we already have an enter timestamp (geofence fired)
      const enterTs = await getEnterTimestamp(region.id);
      if (enterTs != null) continue; // geofence already tracking

      // Driver is in radius but geofence didn't fire — send notification
      console.log(
        `[Geofence] Fallback: driver in radius of ${region.name} but no geofence event`
      );

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Waitino",
          body: `Jeste li na ${region.name}?`,
          data: {
            warehouseId: region.id,
            warehouseName: region.name,
            latitude: lat,
            longitude: lng,
            accuracy: userLocation.coords.accuracy ?? 10,
            action: "manual_fallback",
          },
        },
        trigger: null, // immediate
      });

      break; // Only one notification at a time
    }
  }
}

// ── Handle notification response (DA button) ───────────

export async function handleManualFallbackConfirm(
  warehouseId: number,
  latitude: number,
  longitude: number,
  accuracyMeters: number
): Promise<void> {
  try {
    await api.post("/checkins/enter", {
      warehouse_id: warehouseId,
      latitude,
      longitude,
      accuracy_meters: accuracyMeters,
      source: "manual_fallback",
    });
    console.log(
      `[Geofence] Manual fallback enter confirmed for warehouse ${warehouseId}`
    );
    await recordEnterTimestamp(warehouseId);
  } catch (err) {
    console.error("[Geofence] Manual fallback API error:", err);
    await enqueueEvent({
      warehouseId,
      warehouseName: `Warehouse ${warehouseId}`,
      type: "enter",
      latitude,
      longitude,
      accuracyMeters,
      timestamp: Date.now(),
    });
  }
}

// ── Stop all geofencing ────────────────────────────────

export async function stopGeofencing(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    GEOFENCE_TASK_NAME
  );
  if (isRegistered) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    console.log("[Geofence] Stopped geofencing");
  }
}
