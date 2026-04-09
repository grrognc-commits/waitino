import { useEffect } from "react";
import { useMap } from "react-leaflet";

interface Props {
  center: [number, number] | null;
  zoom?: number;
}

export function FlyToHandler({ center, zoom = 14 }: Props) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 0.8 });
    }
  }, [map, center, zoom]);

  return null;
}
