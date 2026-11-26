CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"event_id" integer NOT NULL,
	"package_id" integer NOT NULL,
	"rule_set_id" integer NOT NULL,
	"question_order" jsonb NOT NULL,
	"option_order" jsonb NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"deadline_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"last_saved_at" timestamp with time zone,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"score_twk" smallint,
	"score_tiu" smallint,
	"score_tkp" smallint,
	"score_total" smallint,
	"duration_seconds" integer,
	"flag_status" text DEFAULT 'none' NOT NULL,
	"flag_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"package_id" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"join_until" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"results_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "package_questions" (
	"package_id" integer NOT NULL,
	"question_id" uuid NOT NULL,
	"question_version" integer NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"rule_set_id" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"nickname" text NOT NULL,
	"city" text NOT NULL,
	"target_school" text,
	"birth_year" smallint NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"consent_privacy_version" text NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"guardian_ack_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_role_chk" CHECK ("profiles"."role" in ('user','admin'))
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_rule_set_id_rule_sets_id_fk" FOREIGN KEY ("rule_set_id") REFERENCES "public"."rule_sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_questions" ADD CONSTRAINT "package_questions_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_questions" ADD CONSTRAINT "package_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_rule_set_id_rule_sets_id_fk" FOREIGN KEY ("rule_set_id") REFERENCES "public"."rule_sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attempts_user_event_idx" ON "attempts" USING btree ("user_id","event_id");--> statement-breakpoint
CREATE INDEX "attempts_leaderboard_idx" ON "attempts" USING btree ("event_id","status","score_total");--> statement-breakpoint
CREATE INDEX "attempts_deadline_idx" ON "attempts" USING btree ("status","deadline_at");--> statement-breakpoint
CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "package_questions_pk" ON "package_questions" USING btree ("package_id","question_id");--> statement-breakpoint
CREATE INDEX "package_questions_pos_idx" ON "package_questions" USING btree ("package_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "packages_slug_idx" ON "packages" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_nickname_lower_idx" ON "profiles" USING btree (lower("nickname"));