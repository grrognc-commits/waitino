export const API_BASE_URL = __DEV__
  ? "http://10.0.2.2:3001/api" // Android emulator -> host
  : "https://api.waitino.hr/api";

export const GEOFENCE_TASK_NAME = "WAITINO_GEOFENCE_TASK";
export const LOCATION_CHECK_TASK_NAME = "WAITINO_LOCATION_CHECK_TASK";

export const DEFAULT_REGION = {
  latitude: 45.815,
  longitude: 15.9819,
  latitudeDelta: 3.5,
  longitudeDelta: 3.5,
};

/** Max geofence regions (iOS limit = 20, we use same for consistency) */
export const MAX_GEOFENCE_REGIONS = 20;

/** Distance (meters) the driver must move before recalculating nearest regions */
export const RECALCULATE_DISTANCE_M = 5000;

/** Minimum dwell time (ms) — ignore enter+exit under 10 minutes */
export const MIN_DWELL_MS = 10 * 60 * 1000;

/** Fallback: time in radius before prompting (ms) — 10 minutes */
export const FALLBACK_PROMPT_MS = 10 * 60 * 1000;

/** Speed check: max km/h to consider driver stopped (not passing by) */
export const SPEED_THRESHOLD_KMH = 5;

/** Speed check: number of GPS readings */
export const SPEED_CHECK_READINGS = 3;

/** Speed check: interval between readings (ms) */
export const SPEED_CHECK_INTERVAL_MS = 10_000;

/** AsyncStorage key for pending offline events */
export const PENDING_EVENTS_KEY = "waitino_pending_events";

/** AsyncStorage key for enter timestamps (dwell tracking) */
export const ENTER_TIMESTAMPS_KEY = "waitino_enter_timestamps";
