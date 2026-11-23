CREATE TABLE "question_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"label" text NOT NULL,
	"text" text NOT NULL,
	"image_path" text,
	"is_correct" boolean,
	"weight" smallint,
	CONSTRAINT "question_options_label_chk" CHECK ("question_options"."label" in ('A','B','C','D','E')),
	CONSTRAINT "question_options_weight_chk" CHECK ("question_options"."weight" is null or "question_options"."weight" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "question_revisions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"question_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"changed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"subtest_code" text NOT NULL,
	"sub_topic_id" integer NOT NULL,
	"difficulty" smallint NOT NULL,
	"stem" text NOT NULL,
	"image_path" text,
	"image_alt" text,
	"explanation" text DEFAULT '' NOT NULL,
	"quiz_explanation" text,
	"allow_quiz" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"source_note" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "questions_difficulty_chk" CHECK ("questions"."difficulty" between 1 and 3),
	CONSTRAINT "questions_status_chk" CHECK ("questions"."status" in ('draft','review','published','archived'))
);
--> statement-breakpoint
CREATE TABLE "rule_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"config" jsonb NOT NULL,
	"source_note" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sub_topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"subtest_code" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subtests" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"scoring_type" text NOT NULL,
	"sort_order" smallint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_revisions" ADD CONSTRAINT "question_revisions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_subtest_code_subtests_code_fk" FOREIGN KEY ("subtest_code") REFERENCES "public"."subtests"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_sub_topic_id_sub_topics_id_fk" FOREIGN KEY ("sub_topic_id") REFERENCES "public"."sub_topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_topics" ADD CONSTRAINT "sub_topics_subtest_code_subtests_code_fk" FOREIGN KEY ("subtest_code") REFERENCES "public"."subtests"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "question_options_q_label_idx" ON "question_options" USING btree ("question_id","label");--> statement-breakpoint
CREATE UNIQUE INDEX "question_revisions_q_v_idx" ON "question_revisions" USING btree ("question_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_code_idx" ON "questions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "questions_filter_idx" ON "questions" USING btree ("subtest_code","status","sub_topic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sub_topics_slug_idx" ON "sub_topics" USING btree ("slug");