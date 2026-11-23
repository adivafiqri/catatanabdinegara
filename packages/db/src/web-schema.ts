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
