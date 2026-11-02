CREATE TABLE IF NOT EXISTS "customer_favorites" (
  "id" serial PRIMARY KEY NOT NULL,
  "customer_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "salon_id" integer NOT NULL REFERENCES "salons"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "customer_favorites_customer_salon_uq" UNIQUE("customer_id", "salon_id")
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id" serial PRIMARY KEY NOT NULL,
  "customer_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "category" text NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "messages" text DEFAULT '[]' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "specialist_schedules" (
  "id" serial PRIMARY KEY NOT NULL,
  "specialist_id" integer NOT NULL UNIQUE REFERENCES "specialists"("id") ON DELETE CASCADE,
  "working_days" text DEFAULT '[]' NOT NULL,
  "working_hours" text DEFAULT '{}' NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "specialist_schedules" ADD COLUMN IF NOT EXISTS "blocked_slots" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "salon_invitations" (
  "id" serial PRIMARY KEY NOT NULL,
  "salon_id" integer NOT NULL REFERENCES "salons"("id") ON DELETE CASCADE,
  "phone" text NOT NULL,
  "owner_name" text NOT NULL,
  "invited_by" integer REFERENCES "users"("id"),
  "expires_at" timestamp NOT NULL,
  "accepted_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "salon_invitations_phone_idx" ON "salon_invitations"("phone");--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "unique_specialist_slot";--> statement-breakpoint
DROP INDEX IF EXISTS "unique_specialist_slot";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_specialist_slot_active" ON "bookings"("specialist_id", "date", "time") WHERE "status" <> 'cancelled';--> statement-breakpoint
CREATE OR REPLACE FUNCTION "enforce_booking_tenant_consistency"() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "services" WHERE id = NEW.service_id AND salon_id = NEW.salon_id) THEN
    RAISE EXCEPTION 'BOOKING_SERVICE_TENANT_MISMATCH' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "specialists" WHERE id = NEW.specialist_id AND salon_id = NEW.salon_id) THEN
    RAISE EXCEPTION 'BOOKING_SPECIALIST_TENANT_MISMATCH' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
DROP TRIGGER IF EXISTS "bookings_tenant_consistency" ON "bookings";--> statement-breakpoint
CREATE TRIGGER "bookings_tenant_consistency" BEFORE INSERT OR UPDATE OF salon_id, service_id, specialist_id ON "bookings"
FOR EACH ROW EXECUTE FUNCTION "enforce_booking_tenant_consistency"();
