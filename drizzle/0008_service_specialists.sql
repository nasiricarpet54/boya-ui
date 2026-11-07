-- Service ↔ specialists junction: one service can be offered by several
-- specialists ("لاین خدمات با متخصص آن لاین"), and each specialist offers
-- many services. Rows are removed automatically when either side is deleted.
CREATE TABLE IF NOT EXISTS "service_specialists" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_id" integer NOT NULL,
	"specialist_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "service_specialist_uniq" ON "service_specialists" ("service_id","specialist_id");--> statement-breakpoint
ALTER TABLE "service_specialists" ADD CONSTRAINT "service_specialists_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_specialists" ADD CONSTRAINT "service_specialists_specialist_id_specialists_id_fk" FOREIGN KEY ("specialist_id") REFERENCES "public"."specialists"("id") ON DELETE cascade ON UPDATE no action;
