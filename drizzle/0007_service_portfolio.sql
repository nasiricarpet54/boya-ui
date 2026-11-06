-- Salon-admin feature: per-service portfolio images ("نمونه‌کار خدمات").
-- Tenancy flows from services.salon_id; rented-chair specialist services
-- (salon_id NULL, owner_id set) are therefore out of the salon manager's reach.
CREATE TABLE IF NOT EXISTS "service_portfolio_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_id" integer NOT NULL,
	"image_url" text NOT NULL,
	"title" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "service_portfolio_items" ADD CONSTRAINT "service_portfolio_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
