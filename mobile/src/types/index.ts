export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: number | null;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface WarehouseMapItem {
  id: number;
  name: string;
  chain: string;
  lat: number;
  lng: number;
  currentWaitMinutes: number;
  trucksWaiting: number;
  status: "green" | "yellow" | "red";
}

export interface GeofenceRegion {
  id: number;
  name: string;
  gateLatitude: number;
  gateLongitude: number;
  geofenceRadius: number;
}

export interface DepartmentWait {
  id: number;
  name: string;
  trucksWaiting: number;
  avgWaitMinutes: number;
}

export interface ActiveCheckin {
  id: number;
  driverName: string;
  warehouseId: number;
  warehouseName: string;
  cargoType: string;
  enteredAt: string;
  waitMinutes: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PendingGeofenceEvent {
  warehouseId: number;
  warehouseName: string;
  type: "enter" | "exit";
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  timestamp: number;
}
