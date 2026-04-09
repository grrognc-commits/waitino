ALTER TABLE "warehouses" ADD COLUMN "opens_at" text;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "closes_at" text;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "tolerance_minutes" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "works_saturday" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "works_sunday" boolean DEFAULT false NOT NULL;