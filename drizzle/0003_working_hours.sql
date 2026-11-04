-- Ensure specialist working schedule columns exist
ALTER TABLE "specialists" ADD COLUMN IF NOT EXISTS "working_hours" text;
ALTER TABLE "specialists" ADD COLUMN IF NOT EXISTS "working_days" text;
ALTER TABLE "specialists" ADD COLUMN IF NOT EXISTS "is_mobile_active" boolean DEFAULT false NOT NULL;
