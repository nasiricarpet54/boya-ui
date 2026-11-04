-- AUDIT (P0): Persist specialist working schedule (was local-only state).
ALTER TABLE "specialists" ADD COLUMN IF NOT EXISTS "working_hours" text;--> statement-breakpoint
ALTER TABLE "specialists" ADD COLUMN IF NOT EXISTS "working_days" text;
