import { RefreshCw, Check, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import api from "@/services/api";
import type { RolloverItem } from "@/types/alerts";

const REASON_LABELS: Record<string, string> = {
  not_accepted: "Neprihvaćeno",
  late_arrival: "Kasni dolazak",
  dc_closed: "DC zatvoren",
  other: "Ostalo",
};

interface Props {
  rollovers: RolloverItem[];
  onResolved: (id: number) => void;
  onNewClick: () => void;
}

export function RolloverSection({ rollovers, onResolved, onNewClick }: Props) {
  async function handleResolve(id: number) {
    try {
      await api.patch(`/rollovers/${id}/resolve`);
      onResolved(id);
    } catch {
      // silent
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Otvoreni rollover-i ({rollovers.length})
        </h3>
        <Button size="sm" onClick={onNewClick}>
          <Plus size={14} />
          Novi rollover
        </Button>
      </div>

      {rollovers.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">
          Nema otvorenih rollover naloga
        </p>
      ) : (
        <div className="space-y-2">
          {rollovers.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3"
            >
              <div className="rounded-lg bg-blue-50 p-2">
                <RefreshCw size={16} className="text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {r.driverFirstName} {r.driverLastName}
                </p>
                <p className="text-xs text-gray-500">
                  {r.warehouseName} —{" "}
                  {REASON_LABELS[r.reason] ?? r.reason}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={r.priority === "high" ? "red" : "default"}>
                    {r.priority === "high" ? "Visok prioritet" : "Normalan"}
                  </Badge>
                  <span className="text-xs text-gray-400">
                    Preraspoređeno:{" "}
                    {new Date(r.rescheduledDate).toLocaleDateString("hr-HR")}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResolve(r.id)}
              >
                <Check size={14} />
                Riješi
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
