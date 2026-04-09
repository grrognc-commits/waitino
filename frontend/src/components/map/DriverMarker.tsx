import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import type { ActiveCheckin } from "@/types/map";

const truckIconHtml = `<div style="
  width: 28px; height: 28px;
  background: #1e3a5f;
  border: 2px solid #fff;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
    <path d="M15 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 13.52 9H12"/>
    <circle cx="17" cy="18" r="2"/>
    <circle cx="7" cy="18" r="2"/>
  </svg>
</div>`;

const truckIcon = L.divIcon({
  html: truckIconHtml,
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

interface Props {
  checkin: ActiveCheckin;
  warehouseLat: number;
  warehouseLng: number;
}

export function DriverMarker({ checkin, warehouseLat, warehouseLng }: Props) {
  // Offset slightly so drivers don't stack exactly on top of the warehouse
  const offset = (checkin.id % 10) * 0.0003;
  const angle = ((checkin.id * 137.5) % 360) * (Math.PI / 180);
  const lat = warehouseLat + offset * Math.cos(angle);
  const lng = warehouseLng + offset * Math.sin(angle);

  return (
    <Marker position={[lat, lng]} icon={truckIcon}>
      <Tooltip direction="top" offset={[0, -16]}>
        <div className="text-xs">
          <p className="font-semibold">{checkin.driverName}</p>
          <p className="text-gray-500">
            Čeka na {checkin.warehouseName}
          </p>
          <p className="font-medium text-[#1e3a5f]">
            {checkin.waitMinutes} min
          </p>
        </div>
      </Tooltip>
    </Marker>
  );
}
