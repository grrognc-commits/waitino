import { useStore } from "../store";

export type TimeFormat = "24h" | "12h";

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

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

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}.`;
}

export function formatDateTime(date: Date | string, format: TimeFormat = "24h"): string {
  return `${formatDate(date)} ${formatTime(date, format)}`;
}

export function useTimeFormat(): TimeFormat {
  const user = useStore((s) => s.user);
  // Mobile currently defaults to 24h; could read from user profile in future
  return "24h" as TimeFormat;
}
