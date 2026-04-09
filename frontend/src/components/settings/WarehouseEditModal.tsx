import { useState, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, ZoomControl } from "react-leaflet";
import L from "leaflet";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CHAIN_OPTIONS = [
  "kaufland", "lidl", "plodine", "spar", "konzum",
  "tommy", "studenac", "metro", "other",
];

const pinIcon = L.divIcon({
  html: `<div style="width:20px;height:20px;background:#1e3a5f;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
  className: "",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export interface WarehouseData {
  id?: number;
  name: string;
  slug: string;
  address: string;
  city: string;
  chain: string;
  latitude: number;
  longitude: number;
  gateLatitude: number;
  gateLongitude: number;
  geofenceRadius: number;
  opensAt: string | null;
  closesAt: string | null;
  toleranceMinutes: number;
  worksSaturday: boolean;
  worksSunday: boolean;
}

interface Props {
  warehouse: WarehouseData | null;
  onSave: (data: WarehouseData) => Promise<void>;
  onClose: () => void;
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function WarehouseEditModal({ warehouse, onSave, onClose }: Props) {
  const isNew = !warehouse?.id;

  const [form, setForm] = useState<WarehouseData>(() =>
    warehouse ?? {
      name: "", slug: "", address: "", city: "", chain: "other",
      latitude: 45.815, longitude: 15.982,
      gateLatitude: 45.815, gateLongitude: 15.982,
      geofenceRadius: 150,
      opensAt: "07:00", closesAt: "22:00",
      toleranceMinutes: 30,
      worksSaturday: true, worksSunday: false,
    }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isNew) {
      const slug = form.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setForm((f) => ({ ...f, slug }));
    }
  }, [form.name, isNew]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setForm((f) => ({
      ...f,
      gateLatitude: Math.round(lat * 10000) / 10000,
      gateLongitude: Math.round(lng * 10000) / 10000,
      latitude: Math.round(lat * 10000) / 10000,
      longitude: Math.round(lng * 10000) / 10000,
    }));
  }, []);

  async function handleSubmit() {
    if (!form.name || !form.address || !form.city || !form.chain) {
      setError("Ime, adresa, grad i lanac su obavezni");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(form);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Greška pri spremanju";
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error ?? msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-6">
        <div
          className="w-full max-w-[900px] min-h-[600px] rounded-xl border border-gray-200 bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {isNew ? "Novo skladište" : "Uredi skladište"}
            </h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X size={18} />
            </Button>
          </div>

          <div className="space-y-5 p-6">
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            )}

            {/* Map — large */}
            <div>
              <Label>Lokacija ulaza za kamione (klikni na kartu)</Label>
              <div className="mt-2 h-[400px] overflow-hidden rounded-lg border border-gray-200">
                <MapContainer
                  center={[form.gateLatitude, form.gateLongitude]}
                  zoom={15}
                  className="h-full w-full z-0"
                  zoomControl={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <ZoomControl position="topright" />
                  <MapClickHandler onClick={handleMapClick} />
                  <Marker position={[form.gateLatitude, form.gateLongitude]} icon={pinIcon} />
                  <Circle
                    center={[form.gateLatitude, form.gateLongitude]}
                    radius={form.geofenceRadius}
                    pathOptions={{ color: "#1e3a5f", fillColor: "#1e3a5f", fillOpacity: 0.1, weight: 2 }}
                  />
                </MapContainer>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Gate: {form.gateLatitude}, {form.gateLongitude}
              </p>
            </div>

            {/* Geofence radius slider */}
            <div>
              <div className="flex items-center justify-between">
                <Label>Geofence radijus</Label>
                <span className="text-sm font-semibold text-gray-900">{form.geofenceRadius} m</span>
              </div>
              <input
                type="range" min={50} max={500} step={10}
                value={form.geofenceRadius}
                onChange={(e) => setForm((f) => ({ ...f, geofenceRadius: parseInt(e.target.value, 10) }))}
                className="mt-2 w-full accent-[#1e3a5f]"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>50m</span><span>500m</span>
              </div>
            </div>

            {/* ── Working hours section ───────────────── */}
            <div className="rounded-lg border border-gray-200 p-4 space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">Radno vrijeme</h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="wh-opens">Otvara</Label>
                  <Input
                    id="wh-opens" type="time"
                    value={form.opensAt ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, opensAt: e.target.value || null }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wh-closes">Zatvara</Label>
                  <Input
                    id="wh-closes" type="time"
                    value={form.closesAt ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, closesAt: e.target.value || null }))}
                  />
                </div>
              </div>

              {/* Tolerance slider */}
              <div>
                <div className="flex items-center justify-between">
                  <Label>Tolerancija nakon otvaranja</Label>
                  <span className="text-sm font-semibold text-gray-900">{form.toleranceMinutes} min</span>
                </div>
                <input
                  type="range" min={0} max={60} step={5}
                  value={form.toleranceMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, toleranceMinutes: parseInt(e.target.value, 10) }))}
                  className="mt-2 w-full accent-[#1e3a5f]"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0 min</span><span>60 min</span>
                </div>
              </div>

              {/* Day toggles */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, worksSaturday: !f.worksSaturday }))}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      form.worksSaturday ? "bg-[#1e3a5f]" : "bg-gray-300"
                    }`}
                  >
                    <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      form.worksSaturday ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                  <span className="text-sm text-gray-700">Subota</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, worksSunday: !f.worksSunday }))}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      form.worksSunday ? "bg-[#1e3a5f]" : "bg-gray-300"
                    }`}
                  >
                    <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      form.worksSunday ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                  <span className="text-sm text-gray-700">Nedjelja</span>
                </label>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                Čekanje se ne bilježi prije otvaranja + tolerancije. Npr. ako skladište otvara u 7:00
                s tolerancijom 30 min, čekanje se počinje bilježiti od 7:30.
                Ostavite prazno za skladišta bez ograničenja radnog vremena.
              </p>
            </div>

            {/* ── Fields ─────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="wh-name">Ime</Label>
                <Input
                  id="wh-name" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Kaufland DC Jastrebarsko"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-chain">Lanac</Label>
                <select
                  id="wh-chain" value={form.chain}
                  onChange={(e) => setForm((f) => ({ ...f, chain: e.target.value }))}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
                >
                  {CHAIN_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wh-address">Adresa</Label>
              <Input id="wh-address" value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Ulica i broj" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-city">Grad</Label>
              <Input id="wh-city" value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="Zagreb" />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Odustani</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? "Spremanje..." : isNew ? "Kreiraj" : "Spremi promjene"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
