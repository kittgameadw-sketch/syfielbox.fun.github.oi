CREATE TABLE "applications" (
	"id" serial PRIMARY KEY,
	"nick" text NOT NULL,
	"discord" text NOT NULL,
	"age" integer NOT NULL,
	"role" text NOT NULL,
	"playtime" text NOT NULL,
	"experience" text DEFAULT '' NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'beklemede' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
