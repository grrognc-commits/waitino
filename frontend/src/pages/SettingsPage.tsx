import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Search,
  AlertTriangle,
} from "lucide-react";
import api from "@/services/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { WarehouseEditModal } from "@/components/settings/WarehouseEditModal";
import type { ApiResponse } from "@/types/auth";

interface AdminWarehouse {
  id: number;
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
  isActive: boolean;
}

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

export function SettingsPage() {
  const [warehouses, setWarehouses] = useState<AdminWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal state
  const [editWarehouse, setEditWarehouse] = useState<AdminWarehouse | null>(null);
  const [showNew, setShowNew] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteAllStep, setDeleteAllStep] = useState(0); // 0=none, 1=first confirm, 2=final confirm

  const fetchWarehouses = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<AdminWarehouse[]>>(
        "/admin/warehouses"
      );
      if (data.data) setWarehouses(data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const filtered = search
    ? warehouses.filter(
        (w) =>
          w.name.toLowerCase().includes(search.toLowerCase()) ||
          w.city.toLowerCase().includes(search.toLowerCase()) ||
          w.chain.toLowerCase().includes(search.toLowerCase())
      )
    : warehouses;

  // Save (create or update)
  async function handleSave(data: {
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
  }) {
    if (data.id) {
      await api.patch(`/admin/warehouses/${data.id}`, data);
    } else {
      await api.post("/admin/warehouses", data);
    }
    setEditWarehouse(null);
    setShowNew(false);
    await fetchWarehouses();
  }

  // Delete one
  async function handleDelete() {
    if (deleteId == null) return;
    try {
      await api.delete(`/admin/warehouses/${deleteId}`);
      setDeleteId(null);
      await fetchWarehouses();
    } catch {
      // silent
    }
  }

  // Delete all
  async function handleDeleteAll() {
    try {
      await api.delete("/admin/warehouses", {
        headers: { "x-confirm-delete": "DELETE_ALL" },
      });
      setDeleteAllStep(0);
      await fetchWarehouses();
    } catch {
      // silent
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1e3a5f] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Upravljanje skladištima
        </h2>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteAllStep(1)}
          >
            <Trash2 size={14} />
            Obriši sva
          </Button>
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus size={14} />
            Dodaj skladište
          </Button>
        </div>
      </div>

      <Card>
        <div className="border-b border-gray-200 p-4">
          <div className="relative max-w-sm">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              placeholder="Pretraži skladišta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ime</TableHead>
              <TableHead>Lanac</TableHead>
              <TableHead>Grad</TableHead>
              <TableHead>Gate koordinate</TableHead>
              <TableHead>Radijus</TableHead>
              <TableHead className="w-24">Akcije</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                  {search ? "Nema rezultata" : "Nema skladišta"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((wh) => (
                <TableRow key={wh.id}>
                  <TableCell className="font-medium text-gray-900">
                    {wh.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">
                      {CHAIN_LABELS[wh.chain] ?? wh.chain}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-600">{wh.city}</TableCell>
                  <TableCell className="text-xs text-gray-500 font-mono">
                    {wh.gateLatitude}, {wh.gateLongitude}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {wh.geofenceRadius}m
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditWarehouse(wh)}
                        title="Uredi"
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(wh.id)}
                        title="Obriši"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-400">
          {warehouses.length} skladišta ukupno
        </div>
      </Card>

      {/* Edit modal */}
      {editWarehouse && (
        <WarehouseEditModal
          warehouse={editWarehouse}
          onSave={handleSave}
          onClose={() => setEditWarehouse(null)}
        />
      )}

      {/* New modal */}
      {showNew && (
        <WarehouseEditModal
          warehouse={null}
          onSave={handleSave}
          onClose={() => setShowNew(false)}
        />
      )}

      {/* Delete single confirm */}
      {deleteId != null && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setDeleteId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full bg-red-50 p-2">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Obriši skladište?</h3>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Ovo će obrisati skladište i sve povezane podatke (odjeli, check-ini, alerti).
                Ova radnja se ne može poništiti.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteId(null)}>Odustani</Button>
                <Button variant="destructive" onClick={handleDelete}>Obriši</Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete all — step 1 */}
      {deleteAllStep === 1 && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setDeleteAllStep(0)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full bg-red-50 p-2">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Jeste li sigurni?</h3>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Obrisati ćete sva skladišta iz sustava. Nastaviti?
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteAllStep(0)}>Odustani</Button>
                <Button variant="destructive" onClick={() => setDeleteAllStep(2)}>Da, nastavi</Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete all — step 2 (final confirm) */}
      {deleteAllStep === 2 && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setDeleteAllStep(0)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl border-2 border-red-200" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full bg-red-100 p-2">
                  <AlertTriangle size={20} className="text-red-700" />
                </div>
                <h3 className="text-lg font-semibold text-red-700">Zadnja potvrda</h3>
              </div>
              <p className="text-sm text-gray-700 mb-2 font-medium">
                Ovo će obrisati SVA skladišta i sve povezane podatke:
              </p>
              <ul className="text-sm text-gray-500 mb-6 list-disc pl-5 space-y-1">
                <li>Svi odjeli skladišta</li>
                <li>Svi check-ini i geofence eventi</li>
                <li>Svi rollover nalozi</li>
                <li>Svi alerti povezani sa skladištima</li>
              </ul>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteAllStep(0)}>Odustani</Button>
                <Button variant="destructive" onClick={handleDeleteAll}>
                  Obriši SVE
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
