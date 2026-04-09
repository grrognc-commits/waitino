import { useAuth } from "@/hooks/useAuth";

export type TimeFormat = "24h" | "12h";

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Format time: "14:30" (24h) or "2:30 PM" (12h)
 */
export function formatTime(date: Date | string, format: TimeFormat = "24h"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const h = d.getHours();
  const m = pad(d.getMinutes());

  if (format === "12h") {
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${period}`;
  }
  return `${pad(h)}:${m}`;
}

/**
 * Format date: always "dd.MM.yyyy." (European)
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}.`;
}

/**
 * Format date+time: "09.04.2026. 14:30" (24h) or "09.04.2026. 2:30 PM" (12h)
 */
export function formatDateTime(date: Date | string, format: TimeFormat = "24h"): string {
  return `${formatDate(date)} ${formatTime(date, format)}`;
}

/**
 * Relative time: "upravo", "prije 5 min", "prije 2h", or full date
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "upravo";
  if (diffMin < 60) return `prije ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `prije ${diffH}h`;
  return formatDate(d);
}

/**
 * Hook: reads time format from auth context (company.timeFormat)
 */
export function useTimeFormat(): TimeFormat {
  const { user } = useAuth();
  const fmt = user?.company?.timeFormat;
  return fmt === "12h" ? "12h" : "24h";
}
