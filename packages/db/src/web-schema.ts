// Skema bank soal (Milestone 2). Schema `public` milik web; diakses HANYA dari server
// (service role / koneksi langsung). RLS aktif tanpa policy → tidak terbaca lewat API publik Supabase.
// Lihat docs/SKEMA-DATA.md §2 & §4.
import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const subtests = pgTable("subtests", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  scoringType: text("scoring_type").notNull(),
  sortOrder: smallint("sort_order").notNull(),
});

export const subTopics = pgTable(
  "sub_topics",
  {
    id: serial("id").primaryKey(),
    subtestCode: text("subtest_code")
      .notNull()
      .references(() => subtests.code),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    active: boolean("active").notNull().default(true),
  },
  (t) => [uniqueIndex("sub_topics_slug_idx").on(t.slug)],
);

export const schools = pgTable("schools", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
});

export const ruleSets = pgTable("rule_sets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  config: jsonb("config").notNull(),
  sourceNote: text("source_note").notNull(),
  status: text("status").notNull().default("draft"),
  createdBy: uuid("created_by"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const QUESTION_STATUSES = ["draft", "review", "published", "archived"] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    subtestCode: text("subtest_code")
      .notNull()
      .references(() => subtests.code),
    subTopicId: integer("sub_topic_id")
      .notNull()
      .references(() => subTopics.id),
    difficulty: smallint("difficulty").notNull(),
    stem: text("stem").notNull(),
    imagePath: text("image_path"),
    imageAlt: text("image_alt"),
    explanation: text("explanation").notNull().default(""),
    quizExplanation: text("quiz_explanation"),
    allowQuiz: boolean("allow_quiz").notNull().default(false),
    status: text("status").$type<QuestionStatus>().notNull().default("draft"),
    sourceNote: text("source_note").notNull(),
    version: integer("version").notNull().default(1),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("questions_code_idx").on(t.code),
    index("questions_filter_idx").on(t.subtestCode, t.status, t.subTopicId),
    check("questions_difficulty_chk", sql`${t.difficulty} between 1 and 3`),
    check("questions_status_chk", sql`${t.status} in ('draft','review','published','archived')`),
  ],
);

export const questionOptions = pgTable(
  "question_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    text: text("text").notNull(),
    imagePath: text("image_path"),
    isCorrect: boolean("is_correct"),
    weight: smallint("weight"),
  },
  (t) => [
    uniqueIndex("question_options_q_label_idx").on(t.questionId, t.label),
    check("question_options_label_chk", sql`${t.label} in ('A','B','C','D','E')`),
    check("question_options_weight_chk", sql`${t.weight} is null or ${t.weight} between 1 and 5`),
  ],
);

/** Salinan soal sebelum diubah → attempt lama tetap bisa menampilkan versi yang dikerjakan. */
export const questionRevisions = pgTable(
  "question_revisions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    changedBy: uuid("changed_by"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("question_revisions_q_v_idx").on(t.questionId, t.version)],
);

// ---------------------------------------------------------------------------
// Peserta & tryout (percepatan 7 Des 2026). Tabel login (user/session/account/
// verification/twoFactor) dikelola Better Auth sendiri; di sini hanya profil.
// ---------------------------------------------------------------------------

export const ROLES = ["user", "admin"] as const;
export type Role = (typeof ROLES)[number];

/** Profil peserta. userId = id tabel "user" Better Auth (teks). */
export const profiles = pgTable(
  "profiles",
  {
    userId: text("user_id").primaryKey(),
    nickname: text("nickname").notNull(),
    city: text("city").notNull(),
    targetSchool: text("target_school"),
    birthYear: smallint("birth_year").notNull(),
    role: text("role").$type<Role>().notNull().default("user"),
    consentPrivacyVersion: text("consent_privacy_version").notNull(),
    consentAt: ts("consent_at").notNull(),
    /** Centang "sudah mendapat izin orang tua/wali" untuk usia < 18 (keputusan pemilik). */
    guardianAckAt: ts("guardian_ack_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("profiles_nickname_lower_idx").on(sql`lower(${t.nickname})`),
    check("profiles_role_chk", sql`${t.role} in ('user','admin')`),
  ],
);

/** Paket soal: daftar soal terurut (per subtes) mengikuti satu aturan SKD. */
export const packages = pgTable(
  "packages",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    ruleSetId: integer("rule_set_id")
      .notNull()
      .references(() => ruleSets.id),
    status: text("status").notNull().default("draft"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("packages_slug_idx").on(t.slug)],
);

export const packageQuestions = pgTable(
  "package_questions",
  {
    packageId: integer("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id),
    /** Versi soal saat dimasukkan ke paket (jejak audit). */
    questionVersion: integer("question_version").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [
    uniqueIndex("package_questions_pk").on(t.packageId, t.questionId),
    index("package_questions_pos_idx").on(t.packageId, t.position),
  ],
);

/** Event tryout. Mode serentak: semua mulai startsAt, boleh masuk s.d. joinUntil, selesai startsAt+durasi. */
export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    packageId: integer("package_id")
      .notNull()
      .references(() => packages.id),
    startsAt: ts("starts_at").notNull(),
    joinUntil: ts("join_until").notNull(),
    endsAt: ts("ends_at").notNull(),
    /** Pembahasan & peringkat final dibuka setelah waktu ini. */
    resultsAt: ts("results_at").notNull(),
    status: text("status").notNull().default("draft"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("events_slug_idx").on(t.slug)],
);

export const ATTEMPT_STATUSES = ["in_progress", "submitted", "expired_submitted"] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

/** Jawaban selama ujian: { [questionId]: { o: "A".."E" | null, f: boolean } } — label TAMPILAN (sudah diacak). */
export type AnswersDraft = Record<string, { o: string | null; f: boolean }>;

export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id),
    packageId: integer("package_id")
      .notNull()
      .references(() => packages.id),
    ruleSetId: integer("rule_set_id")
      .notNull()
      .references(() => ruleSets.id),
    /** Urutan id soal hasil acak (per subtes). */
    questionOrder: jsonb("question_order").$type<string[]>().notNull(),
    /** Per soal: label ASLI dalam urutan tampil, mis. ["C","A","E","B","D"] → tampil A = asli C. */
    optionOrder: jsonb("option_order").$type<Record<string, string[]>>().notNull(),
    answers: jsonb("answers").$type<AnswersDraft>().notNull().default({}),
    startedAt: ts("started_at").notNull(),
    deadlineAt: ts("deadline_at").notNull(),
    submittedAt: ts("submitted_at"),
    lastSavedAt: ts("last_saved_at"),
    status: text("status").$type<AttemptStatus>().notNull().default("in_progress"),
    scoreTwk: smallint("score_twk"),
    scoreTiu: smallint("score_tiu"),
    scoreTkp: smallint("score_tkp"),
    scoreTotal: smallint("score_total"),
    durationSeconds: integer("duration_seconds"),
    flagStatus: text("flag_status").notNull().default("none"),
    flagReasons: jsonb("flag_reasons").$type<string[]>().notNull().default([]),
  },
  (t) => [
    uniqueIndex("attempts_user_event_idx").on(t.userId, t.eventId),
    index("attempts_leaderboard_idx").on(t.eventId, t.status, t.scoreTotal),
    index("attempts_deadline_idx").on(t.status, t.deadlineAt),
  ],
);
