DO $$ BEGIN
  CREATE TYPE "public"."publication_status" AS ENUM('pending', 'approved', 'active');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "publication_status" "publication_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "specialists" ADD COLUMN IF NOT EXISTS "publication_status" "publication_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "salons" ADD COLUMN IF NOT EXISTS "license_doc_url" text;--> statement-breakpoint
UPDATE "services" AS service SET "publication_status" = 'active'
WHERE service."publication_status" = 'pending' AND EXISTS (
  SELECT 1 FROM "salons" AS salon WHERE salon."id" = service."salon_id" AND salon."is_approved" = true
);--> statement-breakpoint
UPDATE "specialists" AS specialist SET "publication_status" = 'active'
WHERE specialist."publication_status" = 'pending' AND specialist."is_verified" = true AND EXISTS (
  SELECT 1 FROM "salons" AS salon WHERE salon."id" = specialist."salon_id" AND salon."is_approved" = true
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_salon_id_salons_id_fk" FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
