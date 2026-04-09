export interface AlertItem {
  id: number;
  warehouseId: number | null;
  alertType: "long_wait" | "driver_stuck" | "rollover" | "capacity_spike";
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface RolloverItem {
  id: number;
  originalCheckinId: number;
  warehouseId: number;
  warehouseName: string;
  driverId: number;
  driverFirstName: string;
  driverLastName: string;
  reason: "not_accepted" | "late_arrival" | "dc_closed" | "other";
  rescheduledDate: string;
  priority: "high" | "normal";
  isResolved: boolean;
  createdAt: string;
}

export interface AlertSettings {
  longWaitThreshold: number;
  driverStuckThreshold: number;
  pushNotifications: boolean;
  emailDigest: "daily" | "weekly" | "off";
}
