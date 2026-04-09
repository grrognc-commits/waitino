CREATE TYPE "public"."alert_type" AS ENUM('long_wait', 'driver_stuck', 'rollover', 'capacity_spike');--> statement-breakpoint
CREATE TYPE "public"."cargo_type" AS ENUM('frozen', 'chilled', 'ambient', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."chain" AS ENUM('kaufland', 'lidl', 'plodine', 'spar', 'konzum', 'tommy', 'studenac', 'metro', 'other');--> statement-breakpoint
CREATE TYPE "public"."checkin_source" AS ENUM('geofence_auto', 'manual_fallback', 'fleet_gps');--> statement-breakpoint
CREATE TYPE "public"."checkin_status" AS ENUM('waiting', 'completed', 'rolled_over');--> statement-breakpoint
CREATE TYPE "public"."department_name" AS ENUM('frozen', 'chilled', 'ambient', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."geofence_event_type" AS ENUM('enter', 'exit', 'dwell');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'standard', 'premium');--> statement-breakpoint
CREATE TYPE "public"."rollover_priority" AS ENUM('high', 'normal');--> statement-breakpoint
CREATE TYPE "public"."rollover_reason" AS ENUM('not_accepted', 'late_arrival', 'dc_closed', 'other');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('driver', 'dispatcher', 'dc_manager', 'admin');--> statement-breakpoint
CREATE TYPE "public"."vehicle_type" AS ENUM('truck', 'semi_trailer', 'van');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"warehouse_id" integer,
	"alert_type" "alert_type" NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkins" (
	"id" serial PRIMARY KEY NOT NULL,
	"driver_id" integer NOT NULL,
	"vehicle_id" integer,
	"warehouse_id" integer NOT NULL,
	"department_id" integer,
	"cargo_type" "cargo_type" NOT NULL,
	"has_appointment" boolean DEFAULT false NOT NULL,
	"entered_at" timestamp NOT NULL,
	"exited_at" timestamp,
	"wait_minutes" integer,
	"source" "checkin_source" NOT NULL,
	"status" "checkin_status" DEFAULT 'waiting' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text NOT NULL,
	"ruterino_company_id" integer,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "geofence_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"driver_id" integer NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"event_type" "geofence_event_type" NOT NULL,
	"warehouse_id" integer NOT NULL,
	"timestamp" timestamp NOT NULL,
	"accuracy_meters" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rollover_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"original_checkin_id" integer NOT NULL,
	"warehouse_id" integer NOT NULL,
	"driver_id" integer NOT NULL,
	"reason" "rollover_reason" NOT NULL,
	"rescheduled_date" timestamp NOT NULL,
	"priority" "rollover_priority" DEFAULT 'normal' NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text NOT NULL,
	"role" "user_role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"registration_plate" text NOT NULL,
	"vehicle_type" "vehicle_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"warehouse_id" integer NOT NULL,
	"name" "department_name" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"gate_latitude" real NOT NULL,
	"gate_longitude" real NOT NULL,
	"geofence_radius" integer DEFAULT 150 NOT NULL,
	"chain" "chain" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "warehouses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_department_id_warehouse_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."warehouse_departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geofence_events" ADD CONSTRAINT "geofence_events_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geofence_events" ADD CONSTRAINT "geofence_events_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rollover_orders" ADD CONSTRAINT "rollover_orders_original_checkin_id_checkins_id_fk" FOREIGN KEY ("original_checkin_id") REFERENCES "public"."checkins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rollover_orders" ADD CONSTRAINT "rollover_orders_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rollover_orders" ADD CONSTRAINT "rollover_orders_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_departments" ADD CONSTRAINT "warehouse_departments_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_checkins_warehouse_entered" ON "checkins" USING btree ("warehouse_id","entered_at");--> statement-breakpoint
CREATE INDEX "idx_checkins_driver_entered" ON "checkins" USING btree ("driver_id","entered_at");--> statement-breakpoint
CREATE INDEX "idx_geofence_events_driver_timestamp" ON "geofence_events" USING btree ("driver_id","timestamp");