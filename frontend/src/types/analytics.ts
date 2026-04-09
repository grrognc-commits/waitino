export interface HeatmapCell {
  day: number;
  hour: number;
  avgWait: number;
}

export interface DailyAverage {
  date: string;
  avgWait: number;
  totalCheckins: number;
}

export interface WorstWarehouse {
  warehouseId: number;
  name: string;
  avgWait: number;
  totalCheckins: number;
}

export interface AnalyticsData {
  heatmapData: HeatmapCell[][];
  dailyAverages: DailyAverage[];
  worstWarehouses: WorstWarehouse[];
  totalHoursLost: number;
  period: string;
  totalCheckins: number;
}

export interface WarehouseOption {
  id: number;
  name: string;
  chain: string;
}
