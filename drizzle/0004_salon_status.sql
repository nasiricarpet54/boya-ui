CREATE TYPE "public"."salon_status" AS ENUM('active', 'pending', 'suspended');--> statement-breakpoint
ALTER TABLE "salons" ADD COLUMN "status" "salon_status" DEFAULT 'pending' NOT NULL;
