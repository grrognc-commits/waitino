import type { WarehouseOption } from "@/types/analytics";

const CHAIN_OPTIONS = [
  { value: "", label: "Svi lanci" },
  { value: "kaufland", label: "Kaufland" },
  { value: "lidl", label: "Lidl" },
  { value: "plodine", label: "Plodine" },
  { value: "spar", label: "Spar" },
  { value: "konzum", label: "Konzum" },
  { value: "tommy", label: "Tommy" },
  { value: "studenac", label: "Studenac" },
  { value: "metro", label: "Metro" },
  { value: "other", label: "Ostalo" },
];

const PERIOD_OPTIONS = [
  { value: "7d", label: "7 dana" },
  { value: "30d", label: "30 dana" },
  { value: "90d", label: "90 dana" },
];

interface Props {
  warehouses: WarehouseOption[];
  warehouseId: string;
  chain: string;
  period: string;
  onWarehouseChange: (value: string) => void;
  onChainChange: (value: string) => void;
  onPeriodChange: (value: string) => void;
}

export function AnalyticsFilters({
  warehouses,
  warehouseId,
  chain,
  period,
  onWarehouseChange,
  onChainChange,
  onPeriodChange,
}: Props) {
  const filteredWarehouses = chain
    ? warehouses.filter((w) => w.chain === chain)
    : warehouses;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Chain filter */}
      <select
        value={chain}
        onChange={(e) => {
          onChainChange(e.target.value);
          onWarehouseChange(""); // reset warehouse when chain changes
        }}
        className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
      >
        {CHAIN_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Warehouse filter */}
      <select
        value={warehouseId}
        onChange={(e) => onWarehouseChange(e.target.value)}
        className="h-10 max-w-[240px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
      >
        <option value="">Sva skladišta</option>
        {filteredWarehouses.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>

      {/* Period */}
      <div className="flex rounded-lg border border-gray-300 overflow-hidden">
        {PERIOD_OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => onPeriodChange(o.value)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              period === o.value
                ? "bg-[#1e3a5f] text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
