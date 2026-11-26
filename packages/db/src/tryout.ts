// Layanan tryout: paket, event, attempt (mulai/simpan/kumpul), peringkat, pembahasan.
// Prinsip anti-curang (docs/KEAMANAN.md §4): kunci tidak pernah keluar sebelum dikumpulkan,
// urutan soal & opsi diacak per attempt, waktu dari server, pembahasan setelah event selesai.
import { randomInt } from "node:crypto";
import {
  OPTION_LABELS,
  RuleSetConfigSchema,
  scoreAttempt,
  type RuleSetConfig,
  type ScoredQuestion,
  type SubtestCode,
} from "@can/shared";
import { and, asc, desc, eq, inArray, lte, sql } from "drizzle-orm";
import type { Db } from "./index.js";
import {
  attempts,
  events,
  packageQuestions,
  packages,
  profiles,
  questionOptions,
  questions,
  ruleSets,
  type AnswersDraft,
} from "./web-schema.js";

export class TryoutError extends Error {
  constructor(
    readonly code:
      | "event_not_found"
      | "not_open_yet"
      | "join_closed"
      | "attempt_not_found"
      | "already_submitted"
      | "deadline_passed"
      | "invalid_answer"
      | "results_not_ready"
      | "package_incomplete",
    message: string,
  ) {
    super(message);
  }
}

/** Batas toleransi keterlambatan simpan jawaban (jaringan lambat). */
export const SAVE_GRACE_MS = 30_000;

type Rand = (n: number) => number;
const cryptoRand: Rand = (n) => randomInt(n);

function shuffle<T>(a: T[], rand: Rand): T[] {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [x[i], x[j]] = [x[j]!, x[i]!];
  }
  return x;
}

export interface AttemptView {
  id: string;
  status: string;
  startedAt: Date;
  deadlineAt: Date;
  serverNow: Date;
  eventName: string;
  /** Soal tanpa kunci/bobot/pembahasan. Label opsi = label TAMPILAN. */
  questions: {
    id: string;
    no: number;
    subtest: SubtestCode;
    stem: string;
    image: string | null;
    options: { label: string; text: string }[];
  }[];
  answers: AnswersDraft;
}

export class TryoutRepo {
  constructor(
    private readonly db: Db,
    private readonly rand: Rand = cryptoRand,
  ) {}

  // ---------- admin: paket & event ----------

  /**
   * Membuat paket dari soal TERBIT sesuai kuota aturan SKD (mis. 30/35/45), diurutkan per kode.
   * Gagal jika soal terbit belum cukup.
   */
  async createPackageFromPublished(p: { slug: string; name: string; ruleSetId: number }) {
    const [rs] = await this.db.select().from(ruleSets).where(eq(ruleSets.id, p.ruleSetId));
    if (!rs) throw new TryoutError("package_incomplete", "aturan SKD tidak ditemukan");
    const cfg = RuleSetConfigSchema.parse(rs.config);
    const chosen: { id: string; version: number }[] = [];
    for (const code of cfg.order) {
      const need = cfg.subtests.find((s) => s.code === code)!.question_count;
      const rows = await this.db
        .select({ id: questions.id, version: questions.version })
        .from(questions)
        .where(and(eq(questions.subtestCode, code), eq(questions.status, "published")))
        .orderBy(asc(questions.code))
        .limit(need);
      if (rows.length < need) {
        throw new TryoutError(
          "package_incomplete",
          `soal ${code} terbit baru ${rows.length} dari ${need}`,
        );
      }
      chosen.push(...rows);
    }
    return this.db.transaction(async (tx) => {
      const [pkg] = await tx
        .insert(packages)
        .values({ slug: p.slug, name: p.name, ruleSetId: p.ruleSetId, status: "published" })
        .returning();
      await tx
        .insert(packageQuestions)
        .values(
          chosen.map((q, i) => ({
            packageId: pkg!.id,
            questionId: q.id,
            questionVersion: q.version,
            position: i + 1,
          })),
        );
      return pkg!;
    });
  }

  async createEvent(e: {
    slug: string;
    name: string;
    packageId: number;
    startsAt: Date;
    joinWindowMinutes: number;
  }) {
    const [pkg] = await this.db.select().from(packages).where(eq(packages.id, e.packageId));
    if (!pkg) throw new TryoutError("event_not_found", "paket tidak ditemukan");
    const [rs] = await this.db.select().from(ruleSets).where(eq(ruleSets.id, pkg.ruleSetId));
    const endsAt = new Date(e.startsAt.getTime() + rs!.durationMinutes * 60_000);
    const [ev] = await this.db
      .insert(events)
      .values({
        slug: e.slug,
        name: e.name,
        packageId: e.packageId,
        startsAt: e.startsAt,
        joinUntil: new Date(e.startsAt.getTime() + e.joinWindowMinutes * 60_000),
        endsAt,
        resultsAt: endsAt,
        status: "published",
      })
      .returning();
    return ev!;
  }

  async getEvent(slug: string) {
    const [ev] = await this.db.select().from(events).where(eq(events.slug, slug));
    return ev;
  }

  async listEvents() {
    return this.db.select().from(events).orderBy(desc(events.startsAt));
  }

  // ---------- peserta: attempt ----------

  /** Mulai (atau lanjutkan) attempt. Satu peserta satu attempt per event. */
  async start(userId: string, eventSlug: string, now = new Date()) {
    const ev = await this.getEvent(eventSlug);
    if (!ev || ev.status !== "published")
      throw new TryoutError("event_not_found", "event tidak ditemukan");
    const [existing] = await this.db
      .select()
      .from(attempts)
      .where(and(eq(attempts.userId, userId), eq(attempts.eventId, ev.id)));
    if (existing) return existing;
    if (now < ev.startsAt) throw new TryoutError("not_open_yet", "tryout belum dimulai");
    if (now > ev.joinUntil)
      throw new TryoutError("join_closed", "waktu masuk ruang ujian sudah ditutup");

    const [pkg] = await this.db.select().from(packages).where(eq(packages.id, ev.packageId));
    const [rs] = await this.db.select().from(ruleSets).where(eq(ruleSets.id, pkg!.ruleSetId));
    const cfg = RuleSetConfigSchema.parse(rs!.config);
    const pq = await this.db
      .select({ id: questions.id, subtest: questions.subtestCode })
      .from(packageQuestions)
      .innerJoin(questions, eq(questions.id, packageQuestions.questionId))
      .where(eq(packageQuestions.packageId, pkg!.id))
      .orderBy(asc(packageQuestions.position));

    const order: string[] = [];
    for (const code of cfg.order) {
      const group = pq.filter((q) => q.subtest === code).map((q) => q.id);
      order.push(...(cfg.shuffle_questions === "none" ? group : shuffle(group, this.rand)));
    }
    const optionOrder: Record<string, string[]> = {};
    for (const id of order) {
      optionOrder[id] = cfg.shuffle_options
        ? shuffle([...OPTION_LABELS], this.rand)
        : [...OPTION_LABELS];
    }
    const deadline = new Date(
      Math.min(ev.endsAt.getTime(), now.getTime() + rs!.durationMinutes * 60_000),
    );
    const [row] = await this.db
      .insert(attempts)
      .values({
        userId,
        eventId: ev.id,
        packageId: pkg!.id,
        ruleSetId: rs!.id,
        questionOrder: order,
        optionOrder,
        startedAt: now,
        deadlineAt: deadline,
      })
      .onConflictDoNothing({ target: [attempts.userId, attempts.eventId] })
      .returning();
    if (row) return row;
    // Dua permintaan bersamaan: kembalikan yang sudah dibuat.
    const [again] = await this.db
      .select()
      .from(attempts)
      .where(and(eq(attempts.userId, userId), eq(attempts.eventId, ev.id)));
    return again!;
  }

  private async own(attemptId: string, userId: string) {
    const [a] = await this.db
      .select()
      .from(attempts)
      .where(and(eq(attempts.id, attemptId), eq(attempts.userId, userId)));
    if (!a) throw new TryoutError("attempt_not_found", "ujian tidak ditemukan");
    return a;
  }

  /** Tampilan ujian untuk browser: TANPA kunci, bobot, maupun pembahasan. */
  async view(attemptId: string, userId: string, now = new Date()): Promise<AttemptView> {
    let a = await this.own(attemptId, userId);
    if (a.status === "in_progress" && now.getTime() > a.deadlineAt.getTime() + SAVE_GRACE_MS) {
      await this.submit(attemptId, userId, now, true);
      a = await this.own(attemptId, userId);
    }
    const [ev] = await this.db
      .select({ name: events.name })
      .from(events)
      .where(eq(events.id, a.eventId));
    const qs = await this.db
      .select({
        id: questions.id,
        subtest: questions.subtestCode,
        stem: questions.stem,
        image: questions.imagePath,
      })
      .from(questions)
      .where(inArray(questions.id, a.questionOrder));
    const opts = await this.db
      .select({
        questionId: questionOptions.questionId,
        label: questionOptions.label,
        text: questionOptions.text,
      })
      .from(questionOptions)
      .where(inArray(questionOptions.questionId, a.questionOrder));
    const byId = new Map(qs.map((q) => [q.id, q]));
    const optText = new Map(opts.map((o) => [`${o.questionId}:${o.label}`, o.text]));
    return {
      id: a.id,
      status: a.status,
      startedAt: a.startedAt,
      deadlineAt: a.deadlineAt,
      serverNow: now,
      eventName: ev?.name ?? "",
      questions: a.questionOrder.map((id, i) => {
        const q = byId.get(id)!;
        return {
          id,
          no: i + 1,
          subtest: q.subtest as SubtestCode,
          stem: q.stem,
          image: q.image,
          options: a.optionOrder[id]!.map((orig, j) => ({
            label: OPTION_LABELS[j]!,
            text: optText.get(`${id}:${orig}`) ?? "",
          })),
        };
      }),
      answers: a.answers,
    };
  }

  /** Simpan sebagian jawaban (label TAMPILAN). Ditolak setelah batas waktu + toleransi. */
  async save(attemptId: string, userId: string, patch: AnswersDraft, now = new Date()) {
    const a = await this.own(attemptId, userId);
    if (a.status !== "in_progress")
      throw new TryoutError("already_submitted", "ujian sudah dikumpulkan");
    if (now.getTime() > a.deadlineAt.getTime() + SAVE_GRACE_MS) {
      await this.submit(attemptId, userId, now, true);
      throw new TryoutError("deadline_passed", "waktu ujian sudah habis");
    }
    const valid = new Set(a.questionOrder);
    for (const [qid, v] of Object.entries(patch)) {
      if (!valid.has(qid)) throw new TryoutError("invalid_answer", "soal tidak dikenal");
      if (v.o !== null && !(OPTION_LABELS as readonly string[]).includes(v.o)) {
        throw new TryoutError("invalid_answer", "pilihan jawaban tidak valid");
      }
      if (typeof v.f !== "boolean")
        throw new TryoutError("invalid_answer", "tanda ragu tidak valid");
    }
    // Gabungkan di database (atomik) agar dua penyimpanan beruntun tidak saling menimpa.
    await this.db
      .update(attempts)
      .set({
        answers: sql`${attempts.answers} || ${JSON.stringify(patch)}::jsonb`,
        lastSavedAt: now,
      })
      .where(and(eq(attempts.id, attemptId), eq(attempts.status, "in_progress")));
  }

  /** Kumpulkan & nilai. auto = karena waktu habis. Idempoten. */
  async submit(attemptId: string, userId: string, now = new Date(), auto = false) {
    return this.db.transaction(async (tx) => {
      const [a] = await tx
        .select()
        .from(attempts)
        .where(and(eq(attempts.id, attemptId), eq(attempts.userId, userId)))
        .for("update");
      if (!a) throw new TryoutError("attempt_not_found", "ujian tidak ditemukan");
      if (a.status !== "in_progress") return a;
      const [rs] = await tx.select().from(ruleSets).where(eq(ruleSets.id, a.ruleSetId));
      const cfg = RuleSetConfigSchema.parse(rs!.config);
      const scored = await this.scoredQuestions(a.questionOrder, tx as unknown as Db);
      const original = this.toOriginal(a.answers, a.optionOrder);
      const r = scoreAttempt(cfg, scored, original);
      const end = auto ? a.deadlineAt : now < a.deadlineAt ? now : a.deadlineAt;
      const duration = Math.max(0, Math.round((end.getTime() - a.startedAt.getTime()) / 1000));
      const flags: string[] = [];
      if (duration < cfg.min_plausible_seconds && r.answeredCount > 0) flags.push("too_fast");
      const [done] = await tx
        .update(attempts)
        .set({
          status: auto ? "expired_submitted" : "submitted",
          submittedAt: end,
          scoreTwk: r.perSubtest.TWK,
          scoreTiu: r.perSubtest.TIU,
          scoreTkp: r.perSubtest.TKP,
          scoreTotal: r.total,
          durationSeconds: duration,
          flagStatus: flags.length ? "flagged" : "none",
          flagReasons: flags,
        })
        .where(eq(attempts.id, a.id))
        .returning();
      return done!;
    });
  }

  /** Kumpulkan otomatis semua attempt yang lewat batas waktu (dipanggil berkala). */
  async finalizeExpired(now = new Date()) {
    const due = await this.db
      .select({ id: attempts.id, userId: attempts.userId })
      .from(attempts)
      .where(
        and(
          eq(attempts.status, "in_progress"),
          lte(attempts.deadlineAt, new Date(now.getTime() - SAVE_GRACE_MS)),
        ),
      )
      .limit(500);
    for (const d of due) await this.submit(d.id, d.userId, now, true);
    return due.length;
  }

  /** Hasil ringkas (skor) untuk pemilik attempt — boleh segera setelah dikumpulkan. */
  async result(attemptId: string, userId: string) {
    const a = await this.own(attemptId, userId);
    const [ev] = await this.db.select().from(events).where(eq(events.id, a.eventId));
    const [rs] = await this.db.select().from(ruleSets).where(eq(ruleSets.id, a.ruleSetId));
    return { attempt: a, event: ev!, ruleSet: rs! };
  }

  /** Pembahasan lengkap: hanya setelah dikumpulkan DAN event selesai (resultsAt). */
  async review(attemptId: string, userId: string, now = new Date()) {
    const a = await this.own(attemptId, userId);
    if (a.status === "in_progress")
      throw new TryoutError("results_not_ready", "ujian belum dikumpulkan");
    const [ev] = await this.db.select().from(events).where(eq(events.id, a.eventId));
    if (now < ev!.resultsAt)
      throw new TryoutError("results_not_ready", "pembahasan dibuka setelah tryout selesai");
    const qs = await this.db
      .select({
        id: questions.id,
        subtest: questions.subtestCode,
        stem: questions.stem,
        image: questions.imagePath,
        explanation: questions.explanation,
      })
      .from(questions)
      .where(inArray(questions.id, a.questionOrder));
    const opts = await this.db
      .select()
      .from(questionOptions)
      .where(inArray(questionOptions.questionId, a.questionOrder));
    const byId = new Map(qs.map((q) => [q.id, q]));
    return a.questionOrder.map((id, i) => {
      const q = byId.get(id)!;
      const disp = a.optionOrder[id]!;
      const chosen = a.answers[id]?.o ?? null;
      return {
        no: i + 1,
        subtest: q.subtest as SubtestCode,
        stem: q.stem,
        image: q.image,
        explanation: q.explanation,
        chosen,
        options: disp.map((orig, j) => {
          const o = opts.find((x) => x.questionId === id && x.label === orig)!;
          return { label: OPTION_LABELS[j]!, text: o.text, correct: o.isCorrect, weight: o.weight };
        }),
      };
    });
  }

  /** Peringkat event: hanya attempt yang sudah dikumpulkan & tidak dikeluarkan admin. */
  async leaderboard(eventId: number, opts: { limit?: number; school?: string } = {}) {
    const conds = [
      eq(attempts.eventId, eventId),
      inArray(attempts.status, ["submitted", "expired_submitted"]),
      inArray(attempts.flagStatus, ["none", "cleared"]),
    ];
    if (opts.school) conds.push(eq(profiles.targetSchool, opts.school));
    return (
      this.db
        .select({
          userId: attempts.userId,
          nickname: profiles.nickname,
          city: profiles.city,
          targetSchool: profiles.targetSchool,
          total: attempts.scoreTotal,
          twk: attempts.scoreTwk,
          tiu: attempts.scoreTiu,
          tkp: attempts.scoreTkp,
          duration: attempts.durationSeconds,
        })
        .from(attempts)
        .innerJoin(profiles, eq(profiles.userId, attempts.userId))
        .where(and(...conds))
        // Seri: skor lebih tinggi dulu, lalu TKP, TIU, TWK, lalu waktu tercepat (umum dipakai pada CAT).
        .orderBy(
          desc(attempts.scoreTotal),
          desc(attempts.scoreTkp),
          desc(attempts.scoreTiu),
          desc(attempts.scoreTwk),
          asc(attempts.durationSeconds),
        )
        .limit(Math.min(opts.limit ?? 100, 1000))
    );
  }

  // ---------- internal ----------
  private toOriginal(answers: AnswersDraft, optionOrder: Record<string, string[]>) {
    const out: Record<string, string | null> = {};
    for (const [qid, v] of Object.entries(answers)) {
      const idx = v.o ? OPTION_LABELS.indexOf(v.o as (typeof OPTION_LABELS)[number]) : -1;
      out[qid] = idx >= 0 ? (optionOrder[qid]?.[idx] ?? null) : null;
    }
    return out;
  }

  private async scoredQuestions(ids: string[], db: Db): Promise<ScoredQuestion[]> {
    const qs = await db
      .select({ id: questions.id, subtest: questions.subtestCode })
      .from(questions)
      .where(inArray(questions.id, ids));
    const opts = await db
      .select()
      .from(questionOptions)
      .where(inArray(questionOptions.questionId, ids));
    return qs.map((q) => ({
      id: q.id,
      subtest: q.subtest as SubtestCode,
      options: Object.fromEntries(
        opts
          .filter((o) => o.questionId === q.id)
          .map((o) => [
            o.label,
            { correct: o.isCorrect ?? undefined, weight: o.weight ?? undefined },
          ]),
      ),
    }));
  }
}

export type { RuleSetConfig };
