import { useState, useMemo, useCallback } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { useMapData } from "@/hooks/useMapData";
import { WarehouseMarker } from "@/components/map/WarehouseMarker";
import { DriverMarker } from "@/components/map/DriverMarker";
import { MapSidebar } from "@/components/map/MapSidebar";
import { FlyToHandler } from "@/components/map/FlyToHandler";
import type { WarehouseMapItem } from "@/types/map";

const ZAGREB_CENTER: [number, number] = [45.815, 15.9819];
const DEFAULT_ZOOM = 7;

export function DashboardPage() {
  const { warehouses, activeCheckins, loading } = useMapData();
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

  // Build warehouse lat/lng lookup for driver markers
  const warehouseLookup = useMemo(() => {
    const map = new Map<number, { lat: number; lng: number }>();
    for (const wh of warehouses) {
      map.set(wh.id, { lat: wh.lat, lng: wh.lng });
    }
    return map;
  }, [warehouses]);

  const handleSelectWarehouse = useCallback((wh: WarehouseMapItem) => {
    setFlyTarget([wh.lat, wh.lng]);
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1e3a5f] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col lg:flex-row -m-4 lg:-m-6">
      {/* Map */}
      <div className="flex-1 relative min-h-[400px]">
        <MapContainer
          center={ZAGREB_CENTER}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full z-0"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {warehouses.map((wh) => (
            <WarehouseMarker key={wh.id} warehouse={wh} />
          ))}

          {activeCheckins.map((checkin) => {
            const whPos = warehouseLookup.get(checkin.warehouseId);
            if (!whPos) return null;
            return (
              <DriverMarker
                key={checkin.id}
                checkin={checkin}
                warehouseLat={whPos.lat}
                warehouseLng={whPos.lng}
              />
            );
          })}

          <FlyToHandler center={flyTarget} />
        </MapContainer>
      </div>

      {/* Sidebar */}
      <div className="h-80 lg:h-full lg:w-[350px] flex-shrink-0">
        <MapSidebar
          warehouses={warehouses}
          onSelect={handleSelectWarehouse}
        />
      </div>
    </div>
  );
}
