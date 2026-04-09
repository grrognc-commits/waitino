import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { WarehouseMapItem } from "@/types/map";

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

interface Props {
  warehouses: WarehouseMapItem[];
  onSelect: (warehouse: WarehouseMapItem) => void;
}

export function MapSidebar({ warehouses, onSelect }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = q
      ? warehouses.filter(
          (w) =>
            w.name.toLowerCase().includes(q) ||
            w.chain.toLowerCase().includes(q) ||
            (CHAIN_LABELS[w.chain] ?? "").toLowerCase().includes(q)
        )
      : warehouses;

    return [...list].sort((a, b) => b.currentWaitMinutes - a.currentWaitMinutes);
  }, [warehouses, search]);

  return (
    <div className="flex h-full flex-col border-l border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Skladišta ({filtered.length})
        </h3>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <Input
            placeholder="Pretraži po imenu ili lancu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((wh) => (
          <button
            key={wh.id}
            onClick={() => onSelect(wh)}
            className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50"
          >
            {/* Status dot */}
            <div
              className="h-3 w-3 flex-shrink-0 rounded-full"
              style={{
                backgroundColor: STATUS_COLORS[wh.status],
              }}
            />

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {wh.name}
              </p>
              <p className="text-xs text-gray-500">
                {CHAIN_LABELS[wh.chain] ?? wh.chain}
              </p>
            </div>

            {/* Stats */}
            <div className="flex-shrink-0 text-right">
              <p
                className="text-sm font-semibold"
                style={{ color: STATUS_COLORS[wh.status] }}
              >
                {wh.currentWaitMinutes} min
              </p>
              <p className="text-xs text-gray-400">
                {wh.trucksWaiting} kam.
              </p>
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
          <p className="p-4 text-center text-sm text-gray-400">
            Nema rezultata
          </p>
        )}
      </div>
    </div>
  );
}
