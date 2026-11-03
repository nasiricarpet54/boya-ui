CREATE TYPE "public"."publication_status" AS ENUM('pending', 'approved', 'active');--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "publication_status" "publication_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "specialists" ADD COLUMN "publication_status" "publication_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "salons" ADD COLUMN "license_doc_url" text;--> statement-breakpoint
-- Preserve publication for legacy catalog records already attached to approved salons.
-- Other rows remain pending under the new review workflow.
UPDATE "services" AS service
SET "publication_status" = 'active'
WHERE EXISTS (
  SELECT 1 FROM "salons" AS salon
  WHERE salon."id" = service."salon_id" AND salon."is_approved" = true
);--> statement-breakpoint
UPDATE "specialists" AS specialist
SET "publication_status" = 'active'
WHERE specialist."is_verified" = true
  AND EXISTS (
    SELECT 1 FROM "salons" AS salon
    WHERE salon."id" = specialist."salon_id" AND salon."is_approved" = true
  );--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_salon_id_salons_id_fk" FOREIGN KEY ("salon_id") REFERENCES "public"."salons"("id") ON DELETE no action ON UPDATE no action NOT VALID;
