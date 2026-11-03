-- Support tickets module: customer-side tickets + admin replies.
CREATE TABLE IF NOT EXISTS "support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"ticket_code" text NOT NULL,
	"subject" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ticket_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"sender_id" integer,
	"sender_role" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Salon profile fields used by the admin VIP/ranking and tenant views.
ALTER TABLE "salons" ADD COLUMN IF NOT EXISTS "owner_name" text;--> statement-breakpoint
ALTER TABLE "salons" ADD COLUMN IF NOT EXISTS "display_priority" integer DEFAULT 99 NOT NULL;--> statement-breakpoint

-- Publication lifecycle columns are owned by 0001 and must NOT be dropped.
-- This migration keeps them and instead guarantees they exist for fresh
-- installs that may have skipped 0001.
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "publication_status" "publication_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "specialists" ADD COLUMN IF NOT EXISTS "publication_status" "publication_status" DEFAULT 'pending' NOT NULL;
