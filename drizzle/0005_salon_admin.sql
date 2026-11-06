-- Salon-admin feature pack: specialist documents/approval, commissions, weekly schedule.
-- Columns are additive; existing rows keep their defaults.
ALTER TABLE "specialists" ADD COLUMN IF NOT EXISTS "is_rented_chair" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "specialists" ADD COLUMN IF NOT EXISTS "commission_percent" integer;--> statement-breakpoint
ALTER TABLE "specialists" ADD COLUMN IF NOT EXISTS "documents" text;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "specialist_service_commissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"specialist_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"commission_percent" integer NOT NULL,
	CONSTRAINT "sp_svc_commission_uniq" UNIQUE("specialist_id", "service_id")
);--> statement-breakpoint
ALTER TABLE "specialist_service_commissions" ADD CONSTRAINT "sp_svc_commission_specialist_id_specialists_id_fk" FOREIGN KEY ("specialist_id") REFERENCES "public"."specialists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specialist_service_commissions" ADD CONSTRAINT "sp_svc_commission_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "salon_weekly_schedule" (
	"id" serial PRIMARY KEY NOT NULL,
	"salon_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"open_time" text NOT NULL,
	"close_time" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "salon_day_uniq" UNIQUE("salon_id", "day_of_week")
);--> statement-breakpoint
ALTER TABLE "salon_weekly_schedule" ADD CONSTRAINT "salon_weekly_schedule_salon_id_salons_id_fk" FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;
