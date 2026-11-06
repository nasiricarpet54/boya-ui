-- Independent/mobile specialist feature: owner-rooted services + personal weekly schedule.
-- `services.salon_id` becomes nullable so a specialist-owned service can exist
-- without a salon; `owner_id` records the specialist's user row that owns it.
-- The check constraint keeps the invariant: salon_id XOR owner_id populated.
ALTER TABLE "services" ALTER COLUMN "salon_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "owner_id" integer;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'services_salon_or_owner_chk'
  ) THEN
    ALTER TABLE "services" ADD CONSTRAINT "services_salon_or_owner_chk" CHECK (("salon_id" IS NOT NULL) OR ("owner_id" IS NOT NULL));
  END IF;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "specialist_weekly_schedule" (
	"id" serial PRIMARY KEY NOT NULL,
	"specialist_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"open_time" text NOT NULL,
	"close_time" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "spec_day_uniq" UNIQUE("specialist_id", "day_of_week")
);--> statement-breakpoint
ALTER TABLE "specialist_weekly_schedule" ADD CONSTRAINT "specialist_weekly_schedule_specialist_id_specialists_id_fk" FOREIGN KEY ("specialist_id") REFERENCES "public"."specialists"("id") ON DELETE cascade ON UPDATE no action;
