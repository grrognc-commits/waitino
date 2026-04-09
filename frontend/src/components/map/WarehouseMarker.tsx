import { useState } from "react";
import { CircleMarker, Popup } from "react-leaflet";
import api from "@/services/api";
import type { WarehouseMapItem, DepartmentWait } from "@/types/map";
import type { ApiResponse } from "@/types/auth";

const STATUS_COLORS: Record<string, string> = {
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
};

const CHAIN_LABELS: Record<string, string> = {
  kaufland: "Kaufland",
  lidl: "Lidl",
  plodine: "Plodine",
  spar: "Spar",
  konzum: "Konzum",
  tommy: "Tommy",
  studenac: "Studenac",
  metro: "Metro",
  other: "Ostalo",
};

const DEPT_LABELS: Record<string, string> = {
  frozen: "Smrznuto",
  chilled: "Rashlađeno",
  ambient: "Ambijentalno",
  mixed: "Mješovito",
};

function markerRadius(trucksWaiting: number): number {
  if (trucksWaiting === 0) return 8;
  if (trucksWaiting <= 3) return 12;
  if (trucksWaiting <= 8) return 16;
  return 20;
}

interface Props {
  warehouse: WarehouseMapItem;
}

export function WarehouseMarker({ warehouse }: Props) {
  const [departments, setDepartments] = useState<DepartmentWait[] | null>(null);
  const [loadingDepts, setLoadingDepts] = useState(false);

  const color = STATUS_COLORS[warehouse.status] ?? STATUS_COLORS.green;
  const radius = markerRadius(warehouse.trucksWaiting);

  async function handlePopupOpen() {
    if (departments) return;
    setLoadingDepts(true);
    try {
      const { data } = await api.get<ApiResponse<DepartmentWait[]>>(
        `/warehouses/${warehouse.id}/departments`
      );
      if (data.data) {
        setDepartments(data.data);
      }
    } catch {
      // fallback: no department data
    } finally {
      setLoadingDepts(false);
    }
  }

  return (
    <CircleMarker
      center={[warehouse.lat, warehouse.lng]}
      radius={radius}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: 0.7,
        weight: 2,
      }}
      eventHandlers={{ popupopen: handlePopupOpen }}
    >
      <Popup minWidth={220} maxWidth={280}>
        <div className="space-y-2 text-sm">
          <div>
            <p className="font-semibold text-gray-900">{warehouse.name}</p>
            <p className="text-xs text-gray-500">
              {CHAIN_LABELS[warehouse.chain] ?? warehouse.chain}
            </p>
          </div>

          <div className="flex items-center gap-4 rounded-lg bg-gray-50 px-3 py-2">
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color }}>
                {warehouse.currentWaitMinutes}
              </p>
              <p className="text-[10px] text-gray-500">min</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-800">
                {warehouse.trucksWaiting}
              </p>
              <p className="text-[10px] text-gray-500">kamiona</p>
            </div>
          </div>

          {loadingDepts && (
            <p className="text-xs text-gray-400">Učitavanje odjela...</p>
          )}

          {departments && departments.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600">Po odjelu:</p>
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-gray-600">
                    {DEPT_LABELS[dept.name] ?? dept.name}
                  </span>
                  <span className="text-gray-800">
                    {dept.trucksWaiting} kam. / {dept.avgWaitMinutes} min
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Popup>
    </CircleMarker>
  );
}
