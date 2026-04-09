import { eq, and, sql, ilike, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  warehouses,
  warehouseDepartments,
  checkins,
  geofenceEvents,
  alerts,
  rolloverOrders,
} from "../db/schema";

export async function listWarehouses(filters: {
  chain?: string;
  city?: string;
}) {
  const conditions = [eq(warehouses.isActive, true)];

  if (filters.chain) {
    conditions.push(
      sql`${warehouses.chain} = ${filters.chain}` as ReturnType<typeof eq>
    );
  }
  if (filters.city) {
    conditions.push(ilike(warehouses.city, `%${filters.city}%`));
  }

  return db
    .select({
      id: warehouses.id,
      name: warehouses.name,
      chain: warehouses.chain,
      city: warehouses.city,
      latitude: warehouses.latitude,
      longitude: warehouses.longitude,
      geofenceRadius: warehouses.geofenceRadius,
    })
    .from(warehouses)
    .where(and(...conditions))
    .orderBy(warehouses.name);
}

export async function getWarehouseById(id: number) {
  const [warehouse] = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.id, id));

  if (!warehouse) return null;

  const departments = await db
    .select()
    .from(warehouseDepartments)
    .where(eq(warehouseDepartments.warehouseId, id))
    .orderBy(warehouseDepartments.name);

  return { ...warehouse, departments };
}

export async function getDepartmentsWithWait(warehouseId: number) {
  const departments = await db
    .select({
      id: warehouseDepartments.id,
      name: warehouseDepartments.name,
      isActive: warehouseDepartments.isActive,
    })
    .from(warehouseDepartments)
    .where(
      and(
        eq(warehouseDepartments.warehouseId, warehouseId),
        eq(warehouseDepartments.isActive, true)
      )
    );

  const result = [];
  for (const dept of departments) {
    const waitingRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(checkins)
      .where(
        and(
          eq(checkins.warehouseId, warehouseId),
          eq(checkins.departmentId, dept.id),
          eq(checkins.status, "waiting")
        )
      );

    const avgWaitRows = await db
      .select({ avg: sql<number>`coalesce(avg(${checkins.waitMinutes}), 0)` })
      .from(checkins)
      .where(
        and(
          eq(checkins.warehouseId, warehouseId),
          eq(checkins.departmentId, dept.id),
          eq(checkins.status, "waiting")
        )
      );

    result.push({
      ...dept,
      trucksWaiting: Number(waitingRows[0].count),
      avgWaitMinutes: Math.round(Number(avgWaitRows[0].avg)),
    });
  }

  return result;
}

export async function getMapData() {
  const allWarehouses = await db
    .select({
      id: warehouses.id,
      name: warehouses.name,
      chain: warehouses.chain,
      lat: warehouses.latitude,
      lng: warehouses.longitude,
    })
    .from(warehouses)
    .where(eq(warehouses.isActive, true));

  const result = [];
  for (const wh of allWarehouses) {
    const waitingRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(checkins)
      .where(
        and(eq(checkins.warehouseId, wh.id), eq(checkins.status, "waiting"))
      );

    const avgWaitRows = await db
      .select({ avg: sql<number>`coalesce(avg(${checkins.waitMinutes}), 0)` })
      .from(checkins)
      .where(
        and(eq(checkins.warehouseId, wh.id), eq(checkins.status, "waiting"))
      );

    const trucksWaiting = Number(waitingRows[0].count);
    const currentWaitMinutes = Math.round(Number(avgWaitRows[0].avg));

    let status: "green" | "yellow" | "red";
    if (currentWaitMinutes < 30) {
      status = "green";
    } else if (currentWaitMinutes <= 90) {
      status = "yellow";
    } else {
      status = "red";
    }

    result.push({
      id: wh.id,
      name: wh.name,
      chain: wh.chain,
      lat: wh.lat,
      lng: wh.lng,
      currentWaitMinutes,
      trucksWaiting,
      status,
    });
  }

  return result;
}

export async function getGeofenceRegions() {
  return db
    .select({
      id: warehouses.id,
      name: warehouses.name,
      gateLatitude: warehouses.gateLatitude,
      gateLongitude: warehouses.gateLongitude,
      geofenceRadius: warehouses.geofenceRadius,
    })
    .from(warehouses)
    .where(eq(warehouses.isActive, true));
}

export async function createWarehouse(data: {
  name: string;
  slug: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  gateLatitude: number;
  gateLongitude: number;
  geofenceRadius?: number;
  chain: string;
}) {
  const [warehouse] = await db
    .insert(warehouses)
    .values({
      name: data.name,
      slug: data.slug,
      address: data.address,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      gateLatitude: data.gateLatitude,
      gateLongitude: data.gateLongitude,
      geofenceRadius: data.geofenceRadius ?? 150,
      chain: data.chain as typeof warehouses.$inferInsert.chain,
    })
    .returning();

  return warehouse;
}

export async function updateWarehouse(
  id: number,
  data: Partial<{
    name: string;
    address: string;
    city: string;
    latitude: number;
    longitude: number;
    gateLatitude: number;
    gateLongitude: number;
    geofenceRadius: number;
    chain: string;
    isActive: boolean;
  }>
) {
  const values: Record<string, unknown> = { ...data, updatedAt: new Date() };

  const [updated] = await db
    .update(warehouses)
    .set(values)
    .where(eq(warehouses.id, id))
    .returning();

  return updated ?? null;
}

export async function listAllWarehousesAdmin() {
  return db
    .select({
      id: warehouses.id,
      name: warehouses.name,
      slug: warehouses.slug,
      address: warehouses.address,
      city: warehouses.city,
      chain: warehouses.chain,
      latitude: warehouses.latitude,
      longitude: warehouses.longitude,
      gateLatitude: warehouses.gateLatitude,
      gateLongitude: warehouses.gateLongitude,
      geofenceRadius: warehouses.geofenceRadius,
      isActive: warehouses.isActive,
    })
    .from(warehouses)
    .orderBy(warehouses.name);
}

async function deleteWarehouseRelated(warehouseId: number) {
  // Get checkin IDs for this warehouse (needed for rollover_orders FK)
  const whCheckins = await db
    .select({ id: checkins.id })
    .from(checkins)
    .where(eq(checkins.warehouseId, warehouseId));
  const checkinIds = whCheckins.map((c) => c.id);

  if (checkinIds.length > 0) {
    await db.delete(rolloverOrders).where(inArray(rolloverOrders.originalCheckinId, checkinIds));
  }
  // rollover_orders also references warehouse_id directly
  await db.delete(rolloverOrders).where(eq(rolloverOrders.warehouseId, warehouseId));
  await db.delete(geofenceEvents).where(eq(geofenceEvents.warehouseId, warehouseId));
  await db.delete(alerts).where(eq(alerts.warehouseId, warehouseId));
  await db.delete(checkins).where(eq(checkins.warehouseId, warehouseId));
  await db.delete(warehouseDepartments).where(eq(warehouseDepartments.warehouseId, warehouseId));
}

export async function deleteWarehouse(id: number): Promise<boolean> {
  const [wh] = await db.select({ id: warehouses.id }).from(warehouses).where(eq(warehouses.id, id));
  if (!wh) return false;

  await deleteWarehouseRelated(id);
  await db.delete(warehouses).where(eq(warehouses.id, id));
  return true;
}

export async function deleteAllWarehouses(): Promise<number> {
  const all = await db.select({ id: warehouses.id }).from(warehouses);
  for (const wh of all) {
    await deleteWarehouseRelated(wh.id);
  }
  await db.delete(warehouses);
  return all.length;
}
