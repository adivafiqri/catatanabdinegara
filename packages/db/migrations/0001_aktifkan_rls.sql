-- Pertahanan berlapis: RLS aktif tanpa policy. Role anon/authenticated Supabase tidak bisa membaca
-- tabel bot walau schema "bot" suatu saat terekspos API. Pemilik tabel (role bot_rw) tetap bisa akses.
ALTER TABLE "bot"."settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bot"."chat_state" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bot"."members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bot"."pending_verifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bot"."warnings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bot"."actions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bot"."cleanup" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bot"."scheduled_posts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bot"."outbox" ENABLE ROW LEVEL SECURITY;
