import { eq, and, sql, gte, desc } from "drizzle-orm";
import { db } from "../db";
import {
  checkins,
  users,
  warehouses,
  warehouseDepartments,
  alerts,
} from "../db/schema";
import { calculateCurrentWait } from "./checkin";

// ── Overview ───────────────────────────────────────────

export async function getOverview(companyId: number | null) {
  const allWarehouses = await db
    .select({ id: warehouses.id, name: warehouses.name, chain: warehouses.chain })
    .from(warehouses)
    .where(eq(warehouses.isActive, true));

  const result = [];
  for (const wh of allWarehouses) {
    const stats = await calculateCurrentWait(wh.id);

    // For non-admin: only include warehouses where company has drivers waiting
    if (companyId != null && stats.trucksWaiting === 0) {
      const hasCompanyDrivers = await db
        .select({ id: checkins.id })
        .from(checkins)
        .innerJoin(users, eq(checkins.driverId, users.id))
        .where(
          and(
            eq(checkins.warehouseId, wh.id),
            eq(users.companyId, companyId)
          )
        )
        .limit(1);
      if (hasCompanyDrivers.length === 0) continue;
    }

    result.push({
      warehouseId: wh.id,
      name: wh.name,
      chain: wh.chain,
      trucksWaiting: stats.trucksWaiting,
      avgWait: stats.avgWaitMinutes,
      maxWait: stats.maxWaitMinutes,
      status: stats.status,
      byDepartment: stats.byDepartment,
    });
  }

  result.sort((a, b) => b.avgWait - a.avgWait);
  return result;
}

// ── Drivers ────────────────────────────────────────────

export async function getDrivers(companyId: number | null) {
  const conditions = [eq(users.role, "driver"), eq(users.isActive, true)];
  if (companyId != null) {
    conditions.push(eq(users.companyId, companyId));
  }

  const drivers = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
    })
    .from(users)
    .where(and(...conditions))
    .orderBy(users.lastName);

  const now = Date.now();
  const result = [];

  for (const driver of drivers) {
    // Check for active checkin
    const [activeCheckin] = await db
      .select({
        warehouseId: checkins.warehouseId,
        warehouseName: warehouses.name,
        enteredAt: checkins.enteredAt,
      })
      .from(checkins)
      .innerJoin(warehouses, eq(checkins.warehouseId, warehouses.id))
      .where(
        and(eq(checkins.driverId, driver.id), eq(checkins.status, "waiting"))
      );

    // Last completed checkin
    const [lastCompleted] = await db
      .select({
        exitedAt: checkins.exitedAt,
        warehouseName: warehouses.name,
        waitMinutes: checkins.waitMinutes,
      })
      .from(checkins)
      .innerJoin(warehouses, eq(checkins.warehouseId, warehouses.id))
      .where(
        and(
          eq(checkins.driverId, driver.id),
          eq(checkins.status, "completed")
        )
      )
      .orderBy(desc(checkins.exitedAt))
      .limit(1);

    let currentStatus: "idle" | "waiting" | "en_route" | "unloading";
    if (activeCheckin) {
      const waitMin = Math.round(
        (now - activeCheckin.enteredAt.getTime()) / 60000
      );
      // Simple heuristic: if waiting < 10 min, might be unloading
      currentStatus = waitMin < 10 ? "unloading" : "waiting";
    } else {
      currentStatus = "idle";
    }

    result.push({
      id: driver.id,
      name: `${driver.firstName} ${driver.lastName}`,
      phone: driver.phone,
      currentStatus,
      currentWarehouse: activeCheckin
        ? {
            id: activeCheckin.warehouseId,
            name: activeCheckin.warehouseName,
          }
        : null,
      waitSince: activeCheckin?.enteredAt ?? null,
      waitMinutes: activeCheckin
        ? Math.round((now - activeCheckin.enteredAt.getTime()) / 60000)
        : null,
      lastCheckinCompleted: lastCompleted
        ? {
            exitedAt: lastCompleted.exitedAt,
            warehouseName: lastCompleted.warehouseName,
            waitMinutes: lastCompleted.waitMinutes,
          }
        : null,
    });
  }

  return result;
}

// ── Analytics ──────────────────────────────────────────

function parsePeriodDays(period: string): number {
  const match = period.match(/^(\d+)d$/);
  return match ? parseInt(match[1], 10) : 7;
}

export async function getAnalytics(params: {
  companyId: number | null;
  warehouseId?: number;
  period: string;
}) {
  const days = parsePeriodDays(params.period);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const conditions = [
    gte(checkins.enteredAt, since),
    eq(checkins.status, "completed"),
  ];
  if (params.warehouseId) {
    conditions.push(eq(checkins.warehouseId, params.warehouseId));
  }

  // All completed checkins in period
  const rows = await db
    .select({
      enteredAt: checkins.enteredAt,
      waitMinutes: checkins.waitMinutes,
      warehouseId: checkins.warehouseId,
      warehouseName: warehouses.name,
      driverCompanyId: users.companyId,
    })
    .from(checkins)
    .innerJoin(users, eq(checkins.driverId, users.id))
    .innerJoin(warehouses, eq(checkins.warehouseId, warehouses.id))
    .where(and(...conditions));

  const filtered =
    params.companyId != null
      ? rows.filter((r) => r.driverCompanyId === params.companyId)
      : rows;

  // Heatmap: [dayOfWeek 0-6][hour 0-23] = { sum, count }
  const heatmap: { sum: number; count: number }[][] = Array.from(
    { length: 7 },
    () => Array.from({ length: 24 }, () => ({ sum: 0, count: 0 }))
  );

  // Daily aggregates
  const dailyMap = new Map<
    string,
    { sum: number; count: number }
  >();

  // Per-warehouse aggregates
  const warehouseMap = new Map<
    number,
    { name: string; sum: number; count: number }
  >();

  let totalWaitMinutes = 0;

  for (const row of filtered) {
    const wait = row.waitMinutes ?? 0;
    const entered = row.enteredAt;
    const day = entered.getDay();
    const hour = entered.getHours();

    heatmap[day][hour].sum += wait;
    heatmap[day][hour].count += 1;

    const dateKey = entered.toISOString().slice(0, 10);
    const daily = dailyMap.get(dateKey) ?? { sum: 0, count: 0 };
    daily.sum += wait;
    daily.count += 1;
    dailyMap.set(dateKey, daily);

    const whEntry = warehouseMap.get(row.warehouseId) ?? {
      name: row.warehouseName,
      sum: 0,
      count: 0,
    };
    whEntry.sum += wait;
    whEntry.count += 1;
    warehouseMap.set(row.warehouseId, whEntry);

    totalWaitMinutes += wait;
  }

  // Build heatmap_data
  const heatmapData = heatmap.map((daySlots, dayIndex) =>
    daySlots.map((slot, hour) => ({
      day: dayIndex,
      hour,
      avgWait: slot.count > 0 ? Math.round(slot.sum / slot.count) : 0,
    }))
  );

  // Build daily_averages sorted by date
  const dailyAverages = Array.from(dailyMap.entries())
    .map(([date, d]) => ({
      date,
      avgWait: Math.round(d.sum / d.count),
      totalCheckins: d.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Build worst_warehouses top 10
  const worstWarehouses = Array.from(warehouseMap.entries())
    .map(([id, w]) => ({
      warehouseId: id,
      name: w.name,
      avgWait: Math.round(w.sum / w.count),
      totalCheckins: w.count,
    }))
    .sort((a, b) => b.avgWait - a.avgWait)
    .slice(0, 10);

  const totalHoursLost = Math.round((totalWaitMinutes / 60) * 100) / 100;

  return {
    heatmapData,
    dailyAverages,
    worstWarehouses,
    totalHoursLost,
    period: params.period,
    totalCheckins: filtered.length,
  };
}

// ── Alerts ─────────────────────────────────────────────

export async function getAlerts(companyId: number) {
  return db
    .select({
      id: alerts.id,
      warehouseId: alerts.warehouseId,
      alertType: alerts.alertType,
      message: alerts.message,
      isRead: alerts.isRead,
      createdAt: alerts.createdAt,
    })
    .from(alerts)
    .where(and(eq(alerts.companyId, companyId), eq(alerts.isRead, false)))
    .orderBy(desc(alerts.createdAt));
}

export async function markAlertRead(alertId: number, companyId: number) {
  const [updated] = await db
    .update(alerts)
    .set({ isRead: true })
    .where(and(eq(alerts.id, alertId), eq(alerts.companyId, companyId)))
    .returning();

  return updated ?? null;
}
