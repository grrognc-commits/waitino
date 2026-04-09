import { eq, and, sql, gte } from "drizzle-orm";
import { db } from "../db";
import {
  rolloverOrders,
  checkins,
  users,
  warehouses,
  alerts,
} from "../db/schema";
import { broadcastAlert } from "../socket";

// ── Create rollover ────────────────────────────────────

export async function createRollover(data: {
  checkinId: number;
  reason: "not_accepted" | "late_arrival" | "dc_closed" | "other";
  rescheduledDate: string;
  notes?: string;
  dispatcherCompanyId: number;
}) {
  const [checkin] = await db
    .select()
    .from(checkins)
    .where(eq(checkins.id, data.checkinId));

  if (!checkin) {
    throw new Error("Check-in nije pronađen");
  }

  // Verify dispatcher belongs to same company as driver
  const [driver] = await db
    .select({ companyId: users.companyId })
    .from(users)
    .where(eq(users.id, checkin.driverId));

  if (driver.companyId !== data.dispatcherCompanyId) {
    throw new Error("Nemate dozvolu za ovaj check-in");
  }

  if (checkin.status === "rolled_over") {
    throw new Error("Ovaj check-in je već označen kao rollover");
  }

  // Update checkin status
  await db
    .update(checkins)
    .set({ status: "rolled_over" })
    .where(eq(checkins.id, data.checkinId));

  // Create rollover order with high priority
  const [rollover] = await db
    .insert(rolloverOrders)
    .values({
      originalCheckinId: data.checkinId,
      warehouseId: checkin.warehouseId,
      driverId: checkin.driverId,
      reason: data.reason,
      rescheduledDate: new Date(data.rescheduledDate),
      priority: "high",
    })
    .returning();

  // Get warehouse name for alert message
  const [warehouse] = await db
    .select({ name: warehouses.name })
    .from(warehouses)
    .where(eq(warehouses.id, checkin.warehouseId));

  const [driverInfo] = await db
    .select({ firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, checkin.driverId));

  // Create alert for next morning
  const [alert] = await db
    .insert(alerts)
    .values({
      companyId: data.dispatcherCompanyId,
      warehouseId: checkin.warehouseId,
      alertType: "rollover",
      message: `Rollover: ${driverInfo.firstName} ${driverInfo.lastName} na ${warehouse.name} — preraspoređeno za ${new Date(data.rescheduledDate).toLocaleDateString("hr-HR")}`,
    })
    .returning();

  broadcastAlert(data.dispatcherCompanyId, {
    alertType: alert.alertType,
    message: alert.message,
    warehouseId: checkin.warehouseId,
    warehouseName: warehouse.name,
  });

  return rollover;
}

// ── List rollovers ─────────────────────────────────────

export async function listRollovers(params: {
  companyId: number;
  resolved?: boolean;
  date?: string;
}) {
  const conditions = [eq(users.companyId, params.companyId)];

  if (params.resolved !== undefined) {
    conditions.push(eq(rolloverOrders.isResolved, params.resolved));
  }
  if (params.date) {
    const dayStart = new Date(params.date);
    const dayEnd = new Date(params.date);
    dayEnd.setDate(dayEnd.getDate() + 1);
    conditions.push(gte(rolloverOrders.rescheduledDate, dayStart));
    conditions.push(
      sql`${rolloverOrders.rescheduledDate} < ${dayEnd}` as ReturnType<typeof eq>
    );
  }

  return db
    .select({
      id: rolloverOrders.id,
      originalCheckinId: rolloverOrders.originalCheckinId,
      warehouseId: rolloverOrders.warehouseId,
      warehouseName: warehouses.name,
      driverId: rolloverOrders.driverId,
      driverFirstName: users.firstName,
      driverLastName: users.lastName,
      reason: rolloverOrders.reason,
      rescheduledDate: rolloverOrders.rescheduledDate,
      priority: rolloverOrders.priority,
      isResolved: rolloverOrders.isResolved,
      createdAt: rolloverOrders.createdAt,
    })
    .from(rolloverOrders)
    .innerJoin(users, eq(rolloverOrders.driverId, users.id))
    .innerJoin(warehouses, eq(rolloverOrders.warehouseId, warehouses.id))
    .where(and(...conditions))
    .orderBy(rolloverOrders.createdAt);
}

// ── Resolve rollover ───────────────────────────────────

export async function resolveRollover(id: number, companyId: number) {
  // Verify ownership via driver's company
  const [rollover] = await db
    .select({ driverId: rolloverOrders.driverId })
    .from(rolloverOrders)
    .where(eq(rolloverOrders.id, id));

  if (!rollover) {
    throw new Error("Rollover nije pronađen");
  }

  const [driver] = await db
    .select({ companyId: users.companyId })
    .from(users)
    .where(eq(users.id, rollover.driverId));

  if (driver.companyId !== companyId) {
    throw new Error("Nemate dozvolu za ovaj rollover");
  }

  const [updated] = await db
    .update(rolloverOrders)
    .set({ isResolved: true })
    .where(eq(rolloverOrders.id, id))
    .returning();

  return updated;
}

// ── Stats ──────────────────────────────────────────────

export async function getStats(companyId: number) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // All rollovers this month for company
  const rows = await db
    .select({
      id: rolloverOrders.id,
      warehouseId: rolloverOrders.warehouseId,
      warehouseName: warehouses.name,
      reason: rolloverOrders.reason,
    })
    .from(rolloverOrders)
    .innerJoin(users, eq(rolloverOrders.driverId, users.id))
    .innerJoin(warehouses, eq(rolloverOrders.warehouseId, warehouses.id))
    .where(
      and(
        eq(users.companyId, companyId),
        gte(rolloverOrders.createdAt, monthStart)
      )
    );

  // By warehouse
  const byWarehouse = new Map<number, { name: string; count: number }>();
  for (const r of rows) {
    const entry = byWarehouse.get(r.warehouseId) ?? {
      name: r.warehouseName,
      count: 0,
    };
    entry.count += 1;
    byWarehouse.set(r.warehouseId, entry);
  }

  // By reason
  const byReason = new Map<string, number>();
  for (const r of rows) {
    byReason.set(r.reason, (byReason.get(r.reason) ?? 0) + 1);
  }

  return {
    rolloverCountThisMonth: rows.length,
    byWarehouse: Array.from(byWarehouse.entries())
      .map(([warehouseId, v]) => ({
        warehouseId,
        name: v.name,
        count: v.count,
      }))
      .sort((a, b) => b.count - a.count),
    byReason: Array.from(byReason.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
  };
}
