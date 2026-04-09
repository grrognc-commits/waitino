/**
 * Waitino Smoke Test Suite
 *
 * Standalone test runner — no external test framework needed.
 * Boots the Express app on a random port and runs HTTP assertions.
 *
 * Usage: npx tsx src/tests/smoke.ts
 * Requires: DATABASE_URL in .env pointing to a test/dev database with seed data.
 */

import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import healthRouter from "../routes/health";
import authRouter from "../routes/auth";
import warehouseRouter from "../routes/warehouses";
import adminWarehouseRouter from "../routes/adminWarehouses";
import checkinRouter from "../routes/checkins";
import dashboardRouter from "../routes/dashboard";
import rolloverRouter from "../routes/rollovers";
import integrationRouter from "../routes/integration";
import { errorHandler } from "../middleware/errorHandler";
import { initSocket } from "../socket";

// ── App setup ──────────────────────────────────────────

const app = express();
const server = http.createServer(app);
initSocket(server);

app.use(cors());
app.use(express.json());
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/warehouses", warehouseRouter);
app.use("/api/admin/warehouses", adminWarehouseRouter);
app.use("/api/checkins", checkinRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/rollovers", rolloverRouter);
app.use("/api/integration", integrationRouter);
app.use(errorHandler);

// ── Test framework ─────────────────────────────────────

let BASE_URL = "";
let passed = 0;
let failed = 0;
const errors: string[] = [];

async function request(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<{ status: number; data: Record<string, unknown> }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json()) as Record<string, unknown>;
  return { status: res.status, data };
}

function get(obj: unknown, ...keys: string[]): unknown {
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    errors.push(message);
    console.log(`  ✗ ${message}`);
  }
}

// ── Tests ──────────────────────────────────────────────

const UNIQUE = Date.now();
let driverToken = "";
let dispatcherToken = "";
let registeredCompanyId = 0;

async function testHealthCheck() {
  const { status, data } = await request("GET", "/api/health");
  assert(status === 200, "Health check returns 200");
  assert(data.success === true, "Health check success=true");
}

async function testRegisterCompany() {
  const { status, data } = await request("POST", "/api/auth/register", {
    companyName: `SmokeTest Co ${UNIQUE}`,
    email: `smoke-dispatcher-${UNIQUE}@test.hr`,
    password: "test1234smoke",
    firstName: "Smoke",
    lastName: "Test",
    phone: "+38591000000",
  });
  assert(status === 201, "Register company returns 201");
  assert(data.success === true, "Register company success=true");
  const inner = (data.data ?? {}) as Record<string, unknown>;
  assert(typeof inner.token === "string", "Register returns token");
  dispatcherToken = (inner.token as string) ?? "";
  const user = (inner.user ?? {}) as Record<string, unknown>;
  registeredCompanyId = (user.companyId as number) ?? 0;
  assert(registeredCompanyId > 0, "Register returns companyId");
}

async function testRegisterDriver() {
  const { status, data } = await request("POST", "/api/auth/register-driver", {
    email: `smoke-driver-${UNIQUE}@test.hr`,
    password: "test1234smoke",
    firstName: "Vozač",
    lastName: "Testni",
    phone: "+38591000001",
    companyId: registeredCompanyId,
  });
  assert(status === 201, "Register driver returns 201");
  const inner = (data.data ?? {}) as Record<string, unknown>;
  driverToken = (inner.token as string) ?? "";
  assert(typeof driverToken === "string" && driverToken.length > 0, "Register driver returns token");
}

async function testLoginDriver() {
  const { status, data } = await request("POST", "/api/auth/login", {
    email: `smoke-driver-${UNIQUE}@test.hr`,
    password: "test1234smoke",
  });
  assert(status === 200, "Login returns 200");
  assert(data.success === true, "Login success=true");
  assert(typeof get(data, "data", "refreshToken") === "string", "Login returns refreshToken");
}

async function testProtectedRouteWithoutToken() {
  const { status } = await request("GET", "/api/checkins/active");
  assert(status === 401, "Protected route without token returns 401");
}

async function testWarehouseList() {
  const { status, data } = await request("GET", "/api/warehouses");
  assert(status === 200, "Warehouse list returns 200");
  const items = data.data as unknown[];
  assert(Array.isArray(items) && items.length > 0, "Warehouse list returns array with items");
}

async function testWarehouseFilterByChain() {
  const { status, data } = await request("GET", "/api/warehouses?chain=kaufland");
  assert(status === 200, "Warehouse filter by chain returns 200");
  const items = (data.data ?? []) as { chain: string }[];
  const allKaufland = items.length > 0 && items.every((i) => i.chain === "kaufland");
  assert(allKaufland, "All filtered warehouses are kaufland");
}

async function testWarehouseMapEndpoint() {
  const { status, data } = await request("GET", "/api/warehouses/map");
  assert(status === 200, "Warehouse map returns 200");
  const items = (data.data ?? []) as { status: string }[];
  assert(items.length > 0, "Map returns warehouses");
  assert(
    items.length === 0 || items.every((i) => ["green", "yellow", "red"].includes(i.status)),
    "All map items have valid status"
  );
}

async function testGeofenceRegions() {
  const { status, data } = await request("GET", "/api/warehouses/geofences");
  assert(status === 200, "Geofence regions returns 200");
  const items = (data.data ?? []) as { gateLatitude: number; geofenceRadius: number }[];
  assert(items.length > 0, "Geofence returns regions");
  assert(items.length > 0 && items[0].gateLatitude > 0, "Region has gateLatitude");
  assert(items.length > 0 && items[0].geofenceRadius > 0, "Region has geofenceRadius");
}

let testCheckinWarehouseId = 0;

async function testCheckinEnter() {
  const { data: whData } = await request("GET", "/api/warehouses");
  const whs = ((whData.data ?? []) as { id: number; latitude: number; longitude: number }[]);
  if (whs.length === 0) { assert(false, "Checkin enter — no warehouses available"); return; }
  testCheckinWarehouseId = whs[0].id;

  const { status, data } = await request(
    "POST",
    "/api/checkins/enter",
    {
      warehouse_id: testCheckinWarehouseId,
      latitude: whs[0].latitude,
      longitude: whs[0].longitude,
      accuracy_meters: 10,
      cargo_type: "ambient",
    },
    { Authorization: `Bearer ${driverToken}` }
  );
  assert(status === 201, "Checkin enter returns 201");
  assert(data.success === true, "Checkin enter success=true");
}

async function testCheckinEnterIdempotent() {
  if (!testCheckinWarehouseId) { assert(false, "Idempotent — no warehouse from prior test"); return; }
  const { data: whData } = await request("GET", "/api/warehouses");
  const whs = ((whData.data ?? []) as { id: number; latitude: number; longitude: number }[]);

  const { status, data } = await request(
    "POST",
    "/api/checkins/enter",
    {
      warehouse_id: testCheckinWarehouseId,
      latitude: whs[0].latitude,
      longitude: whs[0].longitude,
      accuracy_meters: 10,
    },
    { Authorization: `Bearer ${driverToken}` }
  );
  assert(status === 200, "Duplicate checkin enter returns 200 (idempotent)");
  assert(typeof (data as Record<string, string>).message === "string", "Idempotent enter has message");
}

async function testCheckinExit() {
  if (!testCheckinWarehouseId) { assert(false, "Exit — no warehouse from prior test"); return; }
  const { data: whData } = await request("GET", "/api/warehouses");
  const whs = ((whData.data ?? []) as { id: number; latitude: number; longitude: number }[]);

  const { status, data } = await request(
    "POST",
    "/api/checkins/exit",
    {
      warehouse_id: testCheckinWarehouseId,
      latitude: whs[0].latitude,
      longitude: whs[0].longitude,
      accuracy_meters: 10,
    },
    { Authorization: `Bearer ${driverToken}` }
  );
  assert(status === 200, "Checkin exit returns 200");
  assert(get(data, "data", "status") === "completed", "Checkin status is completed");
  assert(typeof get(data, "data", "waitMinutes") === "number", "Checkin has waitMinutes");
}

async function testDashboardOverview() {
  const { status, data } = await request("GET", "/api/dashboard/overview", undefined, {
    Authorization: `Bearer ${dispatcherToken}`,
  });
  assert(status === 200, "Dashboard overview returns 200");
  assert(Array.isArray(data.data), "Dashboard overview returns array");
}

async function testDashboardDrivers() {
  const { status, data } = await request("GET", "/api/dashboard/drivers", undefined, {
    Authorization: `Bearer ${dispatcherToken}`,
  });
  assert(status === 200, "Dashboard drivers returns 200");
  assert(Array.isArray(data.data), "Dashboard drivers returns array");
}

async function testDashboardAnalytics() {
  const { status, data } = await request(
    "GET",
    "/api/dashboard/analytics?period=7d",
    undefined,
    { Authorization: `Bearer ${dispatcherToken}` }
  );
  assert(status === 200, "Dashboard analytics returns 200");
  assert(Array.isArray(get(data, "data", "heatmapData")), "Analytics has heatmapData");
  assert(typeof get(data, "data", "totalHoursLost") === "number", "Analytics has totalHoursLost");
}

async function testDashboardAlerts() {
  const { status, data } = await request("GET", "/api/dashboard/alerts", undefined, {
    Authorization: `Bearer ${dispatcherToken}`,
  });
  assert(status === 200, "Dashboard alerts returns 200");
  assert(Array.isArray(data.data), "Dashboard alerts returns array");
}

let rolloverCheckinId = 0;

async function testRolloverCreate() {
  const { data: whData } = await request("GET", "/api/warehouses");
  const whs = ((whData.data ?? []) as { id: number; latitude: number; longitude: number }[]);
  if (whs.length < 2 || !driverToken) { assert(false, "Rollover create — no data from prior tests"); return; }

  const { data: enterData } = await request(
    "POST",
    "/api/checkins/enter",
    {
      warehouse_id: whs[1].id,
      latitude: whs[1].latitude,
      longitude: whs[1].longitude,
      accuracy_meters: 10,
      cargo_type: "frozen",
    },
    { Authorization: `Bearer ${driverToken}` }
  );
  rolloverCheckinId = (get(enterData, "data", "id") as number) ?? 0;
  if (!rolloverCheckinId) { assert(false, "Rollover — no checkin id from enter"); return; }

  const { status, data } = await request(
    "POST",
    "/api/rollovers",
    {
      checkin_id: rolloverCheckinId,
      reason: "dc_closed",
      rescheduled_date: new Date(Date.now() + 86400000).toISOString(),
    },
    { Authorization: `Bearer ${dispatcherToken}` }
  );
  assert(status === 201, "Rollover create returns 201");
  assert(data.success === true, "Rollover create success=true");
}

async function testRolloverList() {
  const { status, data } = await request("GET", "/api/rollovers?resolved=false", undefined, {
    Authorization: `Bearer ${dispatcherToken}`,
  });
  assert(status === 200, "Rollover list returns 200");
  const items = ((data.data ?? []) as { id: number }[]);
  assert(items.length > 0, "Rollover list has items");
}

async function testRolloverResolve() {
  const { data: listData } = await request("GET", "/api/rollovers?resolved=false", undefined, {
    Authorization: `Bearer ${dispatcherToken}`,
  });
  const items = ((listData.data ?? []) as { id: number }[]);
  if (items.length === 0) {
    assert(false, "Rollover resolve — no items to resolve");
    return;
  }

  const { status, data } = await request(
    "PATCH",
    `/api/rollovers/${items[0].id}/resolve`,
    undefined,
    { Authorization: `Bearer ${dispatcherToken}` }
  );
  assert(status === 200, "Rollover resolve returns 200");
  assert(get(data, "data", "isResolved") === true, "Rollover isResolved=true after resolve");
}

async function testForgotPassword() {
  const { status, data } = await request("POST", "/api/auth/forgot-password", {
    email: "nonexistent@test.hr",
  });
  assert(status === 200, "Forgot password always returns 200 (no user leak)");
  assert(data.success === true, "Forgot password success=true");
}

async function testCheckinHistory() {
  const { status, data } = await request("GET", "/api/checkins/history?limit=5", undefined, {
    Authorization: `Bearer ${dispatcherToken}`,
  });
  assert(status === 200, "Checkin history returns 200");
  assert(typeof get(data, "data", "total") === "number", "History has total count");
  assert(Array.isArray(get(data, "data", "items")), "History has items array");
}

// ── Runner ─────────────────────────────────────────────

async function run() {
  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr !== "string") {
        BASE_URL = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });

  console.log(`\nWaitino Smoke Tests (${BASE_URL})\n${"=".repeat(45)}\n`);

  const tests = [
    testHealthCheck,
    testRegisterCompany,
    testRegisterDriver,
    testLoginDriver,
    testProtectedRouteWithoutToken,
    testWarehouseList,
    testWarehouseFilterByChain,
    testWarehouseMapEndpoint,
    testGeofenceRegions,
    testCheckinEnter,
    testCheckinEnterIdempotent,
    testCheckinExit,
    testDashboardOverview,
    testDashboardDrivers,
    testDashboardAnalytics,
    testDashboardAlerts,
    testRolloverCreate,
    testRolloverList,
    testRolloverResolve,
    testForgotPassword,
    testCheckinHistory,
  ];

  for (const test of tests) {
    try {
      await test();
    } catch (err) {
      failed++;
      const msg = `${test.name} THREW: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      console.log(`  ✗ ${msg}`);
    }
  }

  console.log(`\n${"=".repeat(45)}`);
  console.log(`Rezultat: ${passed} prošlo, ${failed} palo (od ${passed + failed} testova)`);
  if (errors.length > 0) {
    console.log("\nPali testovi:");
    errors.forEach((e) => console.log(`  ✗ ${e}`));
  }

  server.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
