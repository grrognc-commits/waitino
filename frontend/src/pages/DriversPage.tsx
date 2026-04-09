import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  Users,
  Clock,
  Truck,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import api from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
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
import { DriverDetailPanel } from "@/components/drivers/DriverDetailPanel";
import type { DriverItem } from "@/types/drivers";
import type { ApiResponse } from "@/types/auth";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "green" | "blue" | "yellow" | "red" }
> = {
  idle: { label: "Slobodan", variant: "green" },
  en_route: { label: "Na putu", variant: "blue" },
  waiting: { label: "Čeka", variant: "yellow" },
  unloading: { label: "Istovar", variant: "blue" },
};

type SortKey = "name" | "currentStatus" | "location" | "waitMinutes";
type SortDir = "asc" | "desc";

export function DriversPage() {
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedDriver, setSelectedDriver] = useState<DriverItem | null>(null);

  const fetchDrivers = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<DriverItem[]>>(
        "/dashboard/drivers"
      );
      if (data.data) {
        setDrivers(data.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
    const interval = setInterval(fetchDrivers, 30_000);
    return () => clearInterval(interval);
  }, [fetchDrivers]);

  // KPIs
  const kpis = useMemo(() => {
    const total = drivers.length;
    const waiting = drivers.filter(
      (d) => d.currentStatus === "waiting" || d.currentStatus === "unloading"
    ).length;
    const waitMinutes = drivers
      .filter((d) => d.waitMinutes != null)
      .map((d) => d.waitMinutes!);
    const avgWait =
      waitMinutes.length > 0
        ? Math.round(waitMinutes.reduce((a, b) => a + b, 0) / waitMinutes.length)
        : 0;
    const totalHoursLost =
      Math.round(
        (waitMinutes.reduce((a, b) => a + b, 0) / 60) * 10
      ) / 10;

    return { total, waiting, avgWait, totalHoursLost };
  }, [drivers]);

  // Filter + sort
  const sorted = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = q
      ? drivers.filter((d) => d.name.toLowerCase().includes(q))
      : drivers;

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "currentStatus":
          cmp = a.currentStatus.localeCompare(b.currentStatus);
          break;
        case "location":
          cmp = (a.currentWarehouse?.name ?? "").localeCompare(
            b.currentWarehouse?.name ?? ""
          );
          break;
        case "waitMinutes":
          cmp = (a.waitMinutes ?? -1) - (b.waitMinutes ?? -1);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [drivers, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column)
      return <ChevronUp size={14} className="opacity-20" />;
    return sortDir === "asc" ? (
      <ChevronUp size={14} />
    ) : (
      <ChevronDown size={14} />
    );
  }

  function getStatusBadge(driver: DriverItem) {
    const isLongWait =
      driver.currentStatus === "waiting" &&
      driver.waitMinutes != null &&
      driver.waitMinutes > 120;

    const config = isLongWait
      ? { label: "Čeka >2h", variant: "red" as const }
      : STATUS_CONFIG[driver.currentStatus] ?? STATUS_CONFIG.idle;

    return <Badge variant={config.variant}>{config.label}</Badge>;
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
      <h2 className="text-xl font-semibold text-gray-900">Vozači</h2>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-blue-50 p-2">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{kpis.total}</p>
              <p className="text-xs text-gray-500">Ukupno vozača</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-amber-50 p-2">
              <Truck size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{kpis.waiting}</p>
              <p className="text-xs text-gray-500">Trenutno čekaju</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-violet-50 p-2">
              <Clock size={20} className="text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {kpis.avgWait} <span className="text-sm font-normal">min</span>
              </p>
              <p className="text-xs text-gray-500">Prosječno čekanje</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-red-50 p-2">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {kpis.totalHoursLost} <span className="text-sm font-normal">h</span>
              </p>
              <p className="text-xs text-gray-500">Izgubljeno danas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <div className="border-b border-gray-200 p-4">
          <div className="relative max-w-sm">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              placeholder="Pretraži vozače..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  onClick={() => toggleSort("name")}
                  className="flex items-center gap-1"
                >
                  Ime <SortIcon column="name" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort("currentStatus")}
                  className="flex items-center gap-1"
                >
                  Status <SortIcon column="currentStatus" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort("location")}
                  className="flex items-center gap-1"
                >
                  Lokacija <SortIcon column="location" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort("waitMinutes")}
                  className="flex items-center gap-1"
                >
                  Čeka od <SortIcon column="waitMinutes" />
                </button>
              </TableHead>
              <TableHead>Danas čekanja</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-400">
                  {search ? "Nema rezultata" : "Nema vozača"}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((driver) => (
                <TableRow
                  key={driver.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedDriver(driver)}
                >
                  <TableCell className="font-medium text-gray-900">
                    {driver.name}
                  </TableCell>
                  <TableCell>{getStatusBadge(driver)}</TableCell>
                  <TableCell className="text-gray-600">
                    {driver.currentWarehouse?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {driver.waitSince
                      ? new Date(driver.waitSince).toLocaleTimeString("hr-HR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                    {driver.waitMinutes != null && (
                      <span className="ml-1 text-xs text-gray-400">
                        ({driver.waitMinutes} min)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {driver.lastCheckinCompleted?.waitMinutes != null
                      ? `${driver.lastCheckinCompleted.waitMinutes} min`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Slide-out panel */}
      {selectedDriver && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setSelectedDriver(null)}
          />
          <DriverDetailPanel
            driver={selectedDriver}
            onClose={() => setSelectedDriver(null)}
          />
        </>
      )}
    </div>
  );
}
