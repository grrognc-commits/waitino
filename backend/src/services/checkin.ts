import { eq, and, sql, gte, lte, desc } from "drizzle-orm";
import { db } from "../db";
import {
  checkins,
  geofenceEvents,
  users,
  warehouses,
  warehouseDepartments,
  alerts,
  companies,
} from "../db/schema";
import {
  broadcastWarehouseStatus,
  broadcastNewCheckin,
  broadcastCheckinCompleted,
  broadcastAlert,
} from "../socket";

// ── Enter ──────────────────────────────────────────────

export async function enter(data: {
  driverId: number;
  warehouseId: number;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  cargoType?: string;
  vehicleId?: number;
  departmentId?: number;
  hasAppointment?: boolean;
}) {
  // Idempotent: if driver already has active checkin at this warehouse, return it
  const [existing] = await db
    .select()
    .from(checkins)
    .where(
      and(
        eq(checkins.driverId, data.driverId),
        eq(checkins.warehouseId, data.warehouseId),
        eq(checkins.status, "waiting")
      )
    );

  if (existing) {
    return { checkin: existing, created: false };
  }

  // ── Working hours check ─────────────────────────────
  const [wh] = await db
    .select({
      opensAt: warehouses.opensAt,
      closesAt: warehouses.closesAt,
      toleranceMinutes: warehouses.toleranceMinutes,
      worksSaturday: warehouses.worksSaturday,
      worksSunday: warehouses.worksSunday,
    })
    .from(warehouses)
    .where(eq(warehouses.id, data.warehouseId));

  const now = new Date();
  let effectiveEnteredAt = now;

  if (wh?.opensAt != null) {
    // Day-of-week check (0=Sunday, 6=Saturday)
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 && !wh.worksSunday) {
      return { checkin: null, created: false, rejected: true, message: "Skladište ne radi nedjeljom" };
    }
    if (dayOfWeek === 6 && !wh.worksSaturday) {
      return { checkin: null, created: false, rejected: true, message: "Skladište ne radi subotom" };
    }

    // Parse opens_at "HH:MM"
    const [openH, openM] = wh.opensAt.split(":").map(Number);
    const opensDate = new Date(now);
    opensDate.setHours(openH, openM, 0, 0);

    // Before opening time → reject
    if (now < opensDate) {
      return { checkin: null, created: false, rejected: true, message: "Skladište još nije otvoreno", queued: true };
    }

    // Within tolerance window → snap entered_at to opens + tolerance
    const toleranceMs = (wh.toleranceMinutes ?? 30) * 60_000;
    const effectiveStart = new Date(opensDate.getTime() + toleranceMs);
    if (now < effectiveStart) {
      effectiveEnteredAt = effectiveStart;
    }

    // After closing time → reject
    if (wh.closesAt != null) {
      const [closeH, closeM] = wh.closesAt.split(":").map(Number);
      const closesDate = new Date(now);
      closesDate.setHours(closeH, closeM, 0, 0);
      if (now > closesDate) {
        return { checkin: null, created: false, rejected: true, message: "Skladište je zatvoreno" };
      }
    }
  }

  // Create geofence event
  await db.insert(geofenceEvents).values({
    driverId: data.driverId,
    latitude: data.latitude,
    longitude: data.longitude,
    eventType: "enter",
    warehouseId: data.warehouseId,
    timestamp: new Date(),
    accuracyMeters: data.accuracyMeters,
  });

  // Create checkin
  const [checkin] = await db
    .insert(checkins)
    .values({
      driverId: data.driverId,
      warehouseId: data.warehouseId,
      vehicleId: data.vehicleId ?? null,
      departmentId: data.departmentId ?? null,
      cargoType: (data.cargoType ?? "ambient") as "frozen" | "chilled" | "ambient" | "mixed",
      hasAppointment: data.hasAppointment ?? false,
      enteredAt: effectiveEnteredAt,
      source: "geofence_auto",
      status: "waiting",
    })
    .returning();

  // Fetch driver info for broadcast
  const [driver] = await db
    .select({
      firstName: users.firstName,
      lastName: users.lastName,
      companyId: users.companyId,
    })
    .from(users)
    .where(eq(users.id, data.driverId));

  const [warehouse] = await db
    .select({ name: warehouses.name })
    .from(warehouses)
    .where(eq(warehouses.id, data.warehouseId));

  broadcastNewCheckin(data.warehouseId, driver.companyId, {
    driverName: `${driver.firstName} ${driver.lastName}`,
    warehouseName: warehouse?.name ?? "",
    cargoType: checkin.cargoType,
    enteredAt: checkin.enteredAt,
  });

  // Broadcast updated warehouse stats
  const stats = await calculateCurrentWait(data.warehouseId);
  broadcastWarehouseStatus(data.warehouseId, stats);

  return { checkin, created: true };
}

// ── Exit ───────────────────────────────────────────────

export async function exit(data: {
  driverId: number;
  warehouseId: number;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}) {
  const [active] = await db
    .select()
    .from(checkins)
    .where(
      and(
        eq(checkins.driverId, data.driverId),
        eq(checkins.warehouseId, data.warehouseId),
        eq(checkins.status, "waiting")
      )
    );

  if (!active) {
    throw new Error("Nema aktivnog check-ina na ovom skladištu");
  }

  // Create geofence event
  await db.insert(geofenceEvents).values({
    driverId: data.driverId,
    latitude: data.latitude,
    longitude: data.longitude,
    eventType: "exit",
    warehouseId: data.warehouseId,
    timestamp: new Date(),
    accuracyMeters: data.accuracyMeters,
  });

  const now = new Date();
  const waitMinutes = Math.round(
    (now.getTime() - active.enteredAt.getTime()) / 60000
  );

  const [updated] = await db
    .update(checkins)
    .set({
      exitedAt: now,
      waitMinutes,
      status: "completed",
    })
    .where(eq(checkins.id, active.id))
    .returning();

  // Fetch driver + warehouse info for broadcast
  const [driver] = await db
    .select({
      firstName: users.firstName,
      lastName: users.lastName,
      companyId: users.companyId,
    })
    .from(users)
    .where(eq(users.id, data.driverId));

  const [warehouse] = await db
    .select({ name: warehouses.name })
    .from(warehouses)
    .where(eq(warehouses.id, data.warehouseId));

  broadcastCheckinCompleted(data.warehouseId, driver.companyId, {
    driverName: `${driver.firstName} ${driver.lastName}`,
    warehouseName: warehouse?.name ?? "",
    waitMinutes,
  });

  const stats = await calculateCurrentWait(data.warehouseId);
  broadcastWarehouseStatus(data.warehouseId, stats);

  return updated;
}

// ── Active checkins ────────────────────────────────────

export async function getActive(companyId: number | null) {
  const conditions = [eq(checkins.status, "waiting")];

  // If company-scoped, filter to company drivers only
  const rows = await db
    .select({
      id: checkins.id,
      driverFirstName: users.firstName,
      driverLastName: users.lastName,
      driverCompanyId: users.companyId,
      warehouseId: checkins.warehouseId,
      warehouseName: warehouses.name,
      departmentId: checkins.departmentId,
      cargoType: checkins.cargoType,
      enteredAt: checkins.enteredAt,
      hasAppointment: checkins.hasAppointment,
    })
    .from(checkins)
    .innerJoin(users, eq(checkins.driverId, users.id))
    .innerJoin(warehouses, eq(checkins.warehouseId, warehouses.id))
    .where(and(...conditions))
    .orderBy(checkins.enteredAt);

  const filtered =
    companyId != null
      ? rows.filter((r) => r.driverCompanyId === companyId)
      : rows;

  const now = Date.now();
  return filtered.map((r) => {
    const waitMinutes = Math.round(
      (now - r.enteredAt.getTime()) / 60000
    );
    return {
      id: r.id,
      driverName: `${r.driverFirstName} ${r.driverLastName}`,
      warehouseId: r.warehouseId,
      warehouseName: r.warehouseName,
      departmentId: r.departmentId,
      cargoType: r.cargoType,
      enteredAt: r.enteredAt,
      hasAppointment: r.hasAppointment,
      waitMinutes,
    };
  });
}

// ── History ────────────────────────────────────────────

export async function getHistory(filters: {
  companyId: number | null;
  warehouseId?: number;
  driverId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;
  const offset = (page - 1) * limit;

  const conditions = [];

  if (filters.warehouseId) {
    conditions.push(eq(checkins.warehouseId, filters.warehouseId));
  }
  if (filters.driverId) {
    conditions.push(eq(checkins.driverId, filters.driverId));
  }
  if (filters.dateFrom) {
    conditions.push(gte(checkins.enteredAt, new Date(filters.dateFrom)));
  }
  if (filters.dateTo) {
    conditions.push(lte(checkins.enteredAt, new Date(filters.dateTo)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: checkins.id,
      driverId: checkins.driverId,
      driverFirstName: users.firstName,
      driverLastName: users.lastName,
      driverCompanyId: users.companyId,
      warehouseId: checkins.warehouseId,
      warehouseName: warehouses.name,
      cargoType: checkins.cargoType,
      enteredAt: checkins.enteredAt,
      exitedAt: checkins.exitedAt,
      waitMinutes: checkins.waitMinutes,
      status: checkins.status,
      source: checkins.source,
    })
    .from(checkins)
    .innerJoin(users, eq(checkins.driverId, users.id))
    .innerJoin(warehouses, eq(checkins.warehouseId, warehouses.id))
    .where(whereClause)
    .orderBy(desc(checkins.enteredAt))
    .limit(limit)
    .offset(offset);

  const filtered =
    filters.companyId != null
      ? rows.filter((r) => r.driverCompanyId === filters.companyId)
      : rows;

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(checkins)
    .where(whereClause);

  return {
    items: filtered.map((r) => ({
      id: r.id,
      driverId: r.driverId,
      driverName: `${r.driverFirstName} ${r.driverLastName}`,
      warehouseId: r.warehouseId,
      warehouseName: r.warehouseName,
      cargoType: r.cargoType,
      enteredAt: r.enteredAt,
      exitedAt: r.exitedAt,
      waitMinutes: r.waitMinutes,
      status: r.status,
      source: r.source,
    })),
    total: Number(countRow.count),
    page,
    limit,
  };
}

// ── calculateCurrentWait ───────────────────────────────

export async function calculateCurrentWait(warehouseId: number) {
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

  // Waiting trucks (active right now)
  const waitingRows = await db
    .select({
      id: checkins.id,
      enteredAt: checkins.enteredAt,
      departmentId: checkins.departmentId,
    })
    .from(checkins)
    .where(
      and(
        eq(checkins.warehouseId, warehouseId),
        eq(checkins.status, "waiting")
      )
    );

  const now = Date.now();
  const liveWaits = waitingRows.map((r) =>
    Math.round((now - r.enteredAt.getTime()) / 60000)
  );

  const trucksWaiting = liveWaits.length;
  const maxWaitMinutes = liveWaits.length > 0 ? Math.max(...liveWaits) : 0;

  // Avg from last 12h completed + current waiting
  const [completedAvg] = await db
    .select({
      avg: sql<number>`coalesce(avg(${checkins.waitMinutes}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(checkins)
    .where(
      and(
        eq(checkins.warehouseId, warehouseId),
        gte(checkins.enteredAt, twelveHoursAgo)
      )
    );

  const completedAvgVal = Number(completedAvg.avg);
  const completedCount = Number(completedAvg.count);

  // Blend with live waits
  const liveSum = liveWaits.reduce((a, b) => a + b, 0);
  const totalCount = completedCount + trucksWaiting;
  const avgWaitMinutes =
    totalCount > 0
      ? Math.round(
          (completedAvgVal * completedCount + liveSum) / totalCount
        )
      : 0;

  let status: "green" | "yellow" | "red";
  if (avgWaitMinutes < 30) status = "green";
  else if (avgWaitMinutes <= 90) status = "yellow";
  else status = "red";

  // By department
  const departments = await db
    .select({
      id: warehouseDepartments.id,
      name: warehouseDepartments.name,
    })
    .from(warehouseDepartments)
    .where(
      and(
        eq(warehouseDepartments.warehouseId, warehouseId),
        eq(warehouseDepartments.isActive, true)
      )
    );

  const byDepartment = departments.map((dept) => {
    const deptWaiting = waitingRows.filter(
      (r) => r.departmentId === dept.id
    );
    const deptLiveWaits = deptWaiting.map((r) =>
      Math.round((now - r.enteredAt.getTime()) / 60000)
    );
    const deptAvg =
      deptLiveWaits.length > 0
        ? Math.round(
            deptLiveWaits.reduce((a, b) => a + b, 0) / deptLiveWaits.length
          )
        : 0;

    return {
      departmentId: dept.id,
      departmentName: dept.name,
      trucksWaiting: deptWaiting.length,
      avgWaitMinutes: deptAvg,
    };
  });

  return {
    trucksWaiting,
    avgWaitMinutes,
    maxWaitMinutes,
    status,
    byDepartment,
  };
}

// ── generateAlerts ─────────────────────────────────────

export async function generateAlerts() {
  const activeWarehouses = await db
    .select({ id: warehouses.id, name: warehouses.name })
    .from(warehouses)
    .where(eq(warehouses.isActive, true));

  for (const wh of activeWarehouses) {
    const stats = await calculateCurrentWait(wh.id);

    // Long wait alert: avg > 120 min
    if (stats.avgWaitMinutes > 120) {
      // Find companies that have drivers waiting here
      const companyIds = await getCompanyIdsAtWarehouse(wh.id);
      for (const companyId of companyIds) {
        const [existing] = await db
          .select()
          .from(alerts)
          .where(
            and(
              eq(alerts.companyId, companyId),
              eq(alerts.warehouseId, wh.id),
              eq(alerts.alertType, "long_wait"),
              eq(alerts.isRead, false)
            )
          );
        if (!existing) {
          const [alert] = await db
            .insert(alerts)
            .values({
              companyId,
              warehouseId: wh.id,
              alertType: "long_wait",
              message: `Prosječno čekanje na ${wh.name} je ${stats.avgWaitMinutes} min`,
            })
            .returning();

          broadcastAlert(companyId, {
            alertType: alert.alertType,
            message: alert.message,
            warehouseId: wh.id,
            warehouseName: wh.name,
          });
        }
      }
    }
  }

  // Driver stuck alert: any driver waiting > 180 min
  const stuckRows = await db
    .select({
      checkinId: checkins.id,
      driverId: checkins.driverId,
      warehouseId: checkins.warehouseId,
      enteredAt: checkins.enteredAt,
      companyId: users.companyId,
      firstName: users.firstName,
      lastName: users.lastName,
      warehouseName: warehouses.name,
    })
    .from(checkins)
    .innerJoin(users, eq(checkins.driverId, users.id))
    .innerJoin(warehouses, eq(checkins.warehouseId, warehouses.id))
    .where(eq(checkins.status, "waiting"));

  const now = Date.now();
  for (const row of stuckRows) {
    const waitMin = Math.round((now - row.enteredAt.getTime()) / 60000);
    if (waitMin > 180 && row.companyId) {
      const [existing] = await db
        .select()
        .from(alerts)
        .where(
          and(
            eq(alerts.companyId, row.companyId),
            eq(alerts.alertType, "driver_stuck"),
            eq(alerts.isRead, false),
            sql`${alerts.message} LIKE ${"%" + row.firstName + " " + row.lastName + "%"}`
          )
        );
      if (!existing) {
        const [alert] = await db
          .insert(alerts)
          .values({
            companyId: row.companyId,
            warehouseId: row.warehouseId,
            alertType: "driver_stuck",
            message: `Vozač ${row.firstName} ${row.lastName} čeka ${waitMin} min na ${row.warehouseName}`,
          })
          .returning();

        broadcastAlert(row.companyId, {
          alertType: alert.alertType,
          message: alert.message,
          warehouseId: row.warehouseId,
          warehouseName: row.warehouseName,
        });
      }
    }
  }
}

async function getCompanyIdsAtWarehouse(warehouseId: number): Promise<number[]> {
  const rows = await db
    .select({ companyId: users.companyId })
    .from(checkins)
    .innerJoin(users, eq(checkins.driverId, users.id))
    .where(
      and(
        eq(checkins.warehouseId, warehouseId),
        eq(checkins.status, "waiting")
      )
    );

  const ids = new Set<number>();
  for (const r of rows) {
    if (r.companyId != null) ids.add(r.companyId);
  }
  return Array.from(ids);
}
