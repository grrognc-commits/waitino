import { useState, useMemo } from "react";
import type { HeatmapCell } from "@/types/analytics";

const DAY_LABELS = ["Ned", "Pon", "Uto", "Sri", "Čet", "Pet", "Sub"];
const DAY_FULL = [
  "Nedjelja",
  "Ponedjeljak",
  "Utorak",
  "Srijeda",
  "Četvrtak",
  "Petak",
  "Subota",
];

// Display hours 6-22 (working hours)
const HOURS_START = 6;
const HOURS_END = 22;
const HOURS = Array.from(
  { length: HOURS_END - HOURS_START },
  (_, i) => i + HOURS_START
);

// Reorder days: Mon-Sat (indices 1-6), skip Sunday for logistics
const DISPLAY_DAYS = [1, 2, 3, 4, 5, 6, 0];

function getColor(value: number, maxVal: number): string {
  if (value === 0) return "#f3f4f6"; // gray-100
  const ratio = Math.min(value / Math.max(maxVal, 1), 1);
  if (ratio < 0.25) return "#dcfce7"; // green-100
  if (ratio < 0.5) return "#fef9c3"; // yellow-100
  if (ratio < 0.75) return "#fed7aa"; // orange-200
  return "#fecaca"; // red-200
}

function getTextColor(value: number, maxVal: number): string {
  if (value === 0) return "#9ca3af";
  const ratio = Math.min(value / Math.max(maxVal, 1), 1);
  if (ratio < 0.25) return "#166534";
  if (ratio < 0.5) return "#854d0e";
  if (ratio < 0.75) return "#9a3412";
  return "#991b1b";
}

interface Props {
  data: HeatmapCell[][];
}

export function WaitHeatmap({ data }: Props) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  // Flatten to find max for color scale
  const { maxVal, cellMap } = useMemo(() => {
    let max = 0;
    const map = new Map<string, number>();
    for (const daySlots of data) {
      for (const cell of daySlots) {
        if (cell.avgWait > max) max = cell.avgWait;
        map.set(`${cell.day}-${cell.hour}`, cell.avgWait);
      }
    }
    return { maxVal: max, cellMap: map };
  }, [data]);

  const CELL_W = 44;
  const CELL_H = 36;
  const LABEL_W = 40;
  const LABEL_H = 24;

  const svgWidth = LABEL_W + HOURS.length * CELL_W;
  const svgHeight = LABEL_H + DISPLAY_DAYS.length * CELL_H;

  return (
    <div className="relative overflow-x-auto">
      <svg
        width={svgWidth}
        height={svgHeight}
        className="select-none"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      >
        {/* Hour labels */}
        {HOURS.map((hour, i) => (
          <text
            key={`h-${hour}`}
            x={LABEL_W + i * CELL_W + CELL_W / 2}
            y={LABEL_H - 6}
            textAnchor="middle"
            className="fill-gray-400"
            fontSize={10}
          >
            {`${hour}:00`}
          </text>
        ))}

        {/* Day labels + cells */}
        {DISPLAY_DAYS.map((dayIdx, row) => (
          <g key={`d-${dayIdx}`}>
            <text
              x={LABEL_W - 6}
              y={LABEL_H + row * CELL_H + CELL_H / 2 + 4}
              textAnchor="end"
              className="fill-gray-500"
              fontSize={11}
              fontWeight={500}
            >
              {DAY_LABELS[dayIdx]}
            </text>

            {HOURS.map((hour, col) => {
              const val = cellMap.get(`${dayIdx}-${hour}`) ?? 0;
              return (
                <g key={`c-${dayIdx}-${hour}`}>
                  <rect
                    x={LABEL_W + col * CELL_W + 1}
                    y={LABEL_H + row * CELL_H + 1}
                    width={CELL_W - 2}
                    height={CELL_H - 2}
                    rx={4}
                    fill={getColor(val, maxVal)}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                    onMouseEnter={(e) => {
                      const rect = (
                        e.target as SVGRectElement
                      ).getBoundingClientRect();
                      setTooltip({
                        x: rect.left + rect.width / 2,
                        y: rect.top - 8,
                        text: `${DAY_FULL[dayIdx]} ${hour}:00 — prosječno čekanje: ${val} min`,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                  {val > 0 && (
                    <text
                      x={LABEL_W + col * CELL_W + CELL_W / 2}
                      y={LABEL_H + row * CELL_H + CELL_H / 2 + 4}
                      textAnchor="middle"
                      fill={getTextColor(val, maxVal)}
                      fontSize={10}
                      fontWeight={600}
                      className="pointer-events-none"
                    >
                      {val}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        ))}
      </svg>

      {/* Tooltip portal */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-lg"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span>Manje čekanja</span>
        <div className="flex gap-0.5">
          {["#f3f4f6", "#dcfce7", "#fef9c3", "#fed7aa", "#fecaca"].map(
            (c) => (
              <div
                key={c}
                className="h-3 w-6 rounded-sm"
                style={{ backgroundColor: c }}
              />
            )
          )}
        </div>
        <span>Više čekanja</span>
      </div>
    </div>
  );
}
