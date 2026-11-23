CREATE SCHEMA IF NOT EXISTS "bot";
--> statement-breakpoint
CREATE TABLE "bot"."actions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"chat_id" bigint NOT NULL,
	"action" text NOT NULL,
	"target_user_id" bigint,
	"by_user_id" bigint,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot"."chat_state" (
	"chat_id" bigint PRIMARY KEY NOT NULL,
	"last_welcome_message_id" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot"."cleanup" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"chat_id" bigint NOT NULL,
	"message_id" integer NOT NULL,
	"delete_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot"."members" (
	"chat_id" bigint NOT NULL,
	"tg_user_id" bigint NOT NULL,
	"username" text,
	"first_name" text,
	"joined_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"muted_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_chat_id_tg_user_id_pk" PRIMARY KEY("chat_id","tg_user_id")
);
--> statement-breakpoint
CREATE TABLE "bot"."outbox" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"chat_id" bigint NOT NULL,
	"text" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text
);
--> statement-breakpoint
CREATE TABLE "bot"."pending_verifications" (
	"chat_id" bigint NOT NULL,
	"tg_user_id" bigint NOT NULL,
	"message_id" integer,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pending_verifications_chat_id_tg_user_id_pk" PRIMARY KEY("chat_id","tg_user_id")
);
--> statement-breakpoint
CREATE TABLE "bot"."scheduled_posts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"chat_id" bigint NOT NULL,
	"text" text NOT NULL,
	"cron" text NOT NULL,
	"next_run_at" timestamp with time zone NOT NULL,
	"last_run_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot"."settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" bigint,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot"."warnings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"chat_id" bigint NOT NULL,
	"tg_user_id" bigint NOT NULL,
	"reason" text NOT NULL,
	"message_excerpt" text,
	"by_user_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" bigint
);
--> statement-breakpoint
CREATE INDEX "bot_actions_created_idx" ON "bot"."actions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bot_cleanup_due_idx" ON "bot"."cleanup" USING btree ("delete_at");--> statement-breakpoint
CREATE INDEX "bot_members_username_idx" ON "bot"."members" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "bot_outbox_dedupe_idx" ON "bot"."outbox" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "bot_outbox_pending_idx" ON "bot"."outbox" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "bot_pending_expires_idx" ON "bot"."pending_verifications" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "bot_scheduled_due_idx" ON "bot"."scheduled_posts" USING btree ("active","next_run_at");--> statement-breakpoint
CREATE INDEX "bot_warnings_user_idx" ON "bot"."warnings" USING btree ("chat_id","tg_user_id","created_at");