export interface DriverItem {
  id: number;
  name: string;
  phone: string;
  currentStatus: "idle" | "en_route" | "waiting" | "unloading";
  currentWarehouse: { id: number; name: string } | null;
  waitSince: string | null;
  waitMinutes: number | null;
  lastCheckinCompleted: {
    exitedAt: string | null;
    warehouseName: string;
    waitMinutes: number | null;
  } | null;
}

export interface CheckinHistoryItem {
  id: number;
  driverId: number;
  driverName: string;
  warehouseId: number;
  warehouseName: string;
  cargoType: string;
  enteredAt: string;
  exitedAt: string | null;
  waitMinutes: number | null;
  status: string;
  source: string;
}

export interface CheckinHistoryResponse {
  items: CheckinHistoryItem[];
  total: number;
  page: number;
  limit: number;
}
