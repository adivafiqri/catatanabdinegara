-- Tabel web hanya diakses dari server. RLS aktif tanpa policy: role anon/authenticated Supabase
-- tidak bisa membaca/menulis lewat API publik (kunci jawaban & bank soal aman).
ALTER TABLE "subtests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sub_topics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "schools" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rule_sets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "question_options" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "question_revisions" ENABLE ROW LEVEL SECURITY;
