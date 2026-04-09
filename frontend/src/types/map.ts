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

export interface DepartmentWait {
  id: number;
  name: string;
  isActive: boolean;
  trucksWaiting: number;
  avgWaitMinutes: number;
}

export interface ActiveCheckin {
  id: number;
  driverName: string;
  warehouseId: number;
  warehouseName: string;
  departmentId: number | null;
  cargoType: string;
  enteredAt: string;
  hasAppointment: boolean;
  waitMinutes: number;
}
