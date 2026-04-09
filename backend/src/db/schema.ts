import {
  pgTable,
  pgEnum,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  real,
  index,
} from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────

export const planEnum = pgEnum("plan", ["free", "standard", "premium"]);

export const userRoleEnum = pgEnum("user_role", [
  "driver",
  "dispatcher",
  "dc_manager",
  "admin",
]);

export const chainEnum = pgEnum("chain", [
  "kaufland",
  "lidl",
  "plodine",
  "spar",
  "konzum",
  "tommy",
  "studenac",
  "metro",
  "other",
]);

export const departmentNameEnum = pgEnum("department_name", [
  "frozen",
  "chilled",
  "ambient",
  "mixed",
]);

export const vehicleTypeEnum = pgEnum("vehicle_type", [
  "truck",
  "semi_trailer",
  "van",
]);

export const cargoTypeEnum = pgEnum("cargo_type", [
  "frozen",
  "chilled",
  "ambient",
  "mixed",
]);

export const checkinSourceEnum = pgEnum("checkin_source", [
  "geofence_auto",
  "manual_fallback",
  "fleet_gps",
]);

export const checkinStatusEnum = pgEnum("checkin_status", [
  "waiting",
  "completed",
  "rolled_over",
]);

export const rolloverReasonEnum = pgEnum("rollover_reason", [
  "not_accepted",
  "late_arrival",
  "dc_closed",
  "other",
]);

export const rolloverPriorityEnum = pgEnum("rollover_priority", [
  "high",
  "normal",
]);

export const geofenceEventTypeEnum = pgEnum("geofence_event_type", [
  "enter",
  "exit",
  "dwell",
]);

export const alertTypeEnum = pgEnum("alert_type", [
  "long_wait",
  "driver_stuck",
  "rollover",
  "capacity_spike",
]);

// ── 1. Companies ───────────────────────────────────────

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone").notNull(),
  ruterinoCompanyId: integer("ruterino_company_id"),
  plan: planEnum("plan").notNull().default("free"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── 2. Users ───────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  role: userRoleEnum("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── 3. Warehouses ──────────────────────────────────────

export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  gateLatitude: real("gate_latitude").notNull(),
  gateLongitude: real("gate_longitude").notNull(),
  geofenceRadius: integer("geofence_radius").notNull().default(150),
  chain: chainEnum("chain").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── 4. Warehouse departments ───────────────────────────

export const warehouseDepartments = pgTable("warehouse_departments", {
  id: serial("id").primaryKey(),
  warehouseId: integer("warehouse_id")
    .notNull()
    .references(() => warehouses.id),
  name: departmentNameEnum("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

// ── 5. Vehicles ────────────────────────────────────────

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id),
  registrationPlate: text("registration_plate").notNull(),
  vehicleType: vehicleTypeEnum("vehicle_type").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── 6. Checkins ────────────────────────────────────────

export const checkins = pgTable(
  "checkins",
  {
    id: serial("id").primaryKey(),
    driverId: integer("driver_id")
      .notNull()
      .references(() => users.id),
    vehicleId: integer("vehicle_id").references(() => vehicles.id),
    warehouseId: integer("warehouse_id")
      .notNull()
      .references(() => warehouses.id),
    departmentId: integer("department_id").references(
      () => warehouseDepartments.id
    ),
    cargoType: cargoTypeEnum("cargo_type").notNull(),
    hasAppointment: boolean("has_appointment").notNull().default(false),
    enteredAt: timestamp("entered_at").notNull(),
    exitedAt: timestamp("exited_at"),
    waitMinutes: integer("wait_minutes"),
    source: checkinSourceEnum("source").notNull(),
    status: checkinStatusEnum("status").notNull().default("waiting"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_checkins_warehouse_entered").on(
      table.warehouseId,
      table.enteredAt
    ),
    index("idx_checkins_driver_entered").on(table.driverId, table.enteredAt),
  ]
);

// ── 7. Rollover orders ────────────────────────────────

export const rolloverOrders = pgTable("rollover_orders", {
  id: serial("id").primaryKey(),
  originalCheckinId: integer("original_checkin_id")
    .notNull()
    .references(() => checkins.id),
  warehouseId: integer("warehouse_id")
    .notNull()
    .references(() => warehouses.id),
  driverId: integer("driver_id")
    .notNull()
    .references(() => users.id),
  reason: rolloverReasonEnum("reason").notNull(),
  rescheduledDate: timestamp("rescheduled_date").notNull(),
  priority: rolloverPriorityEnum("priority").notNull().default("normal"),
  isResolved: boolean("is_resolved").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── 8. Geofence events ────────────────────────────────

export const geofenceEvents = pgTable(
  "geofence_events",
  {
    id: serial("id").primaryKey(),
    driverId: integer("driver_id")
      .notNull()
      .references(() => users.id),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    eventType: geofenceEventTypeEnum("event_type").notNull(),
    warehouseId: integer("warehouse_id")
      .notNull()
      .references(() => warehouses.id),
    timestamp: timestamp("timestamp").notNull(),
    accuracyMeters: real("accuracy_meters").notNull(),
  },
  (table) => [
    index("idx_geofence_events_driver_timestamp").on(
      table.driverId,
      table.timestamp
    ),
  ]
);

// ── 9. Refresh tokens ─────────────────────────────────

export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── 10. API keys ──────────────────────────────────────

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── 11. Alerts ─────────────────────────────────────────

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id),
  warehouseId: integer("warehouse_id").references(() => warehouses.id),
  alertType: alertTypeEnum("alert_type").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
