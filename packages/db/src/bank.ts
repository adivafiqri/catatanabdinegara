// Layanan bank soal: impor (all-or-nothing), riwayat versi, alur status, daftar, ekspor.
// Dipakai panel admin web & skrip CLI. Validasi isi soal ada di @can/shared.
import {
  DEFAULT_RULE_SET,
  DEFAULT_SCHOOLS,
  DEFAULT_SUB_TOPICS,
  SUBTESTS,
  SUBTEST_CODES,
  contextFromTopics,
  validateQuestion,
  type Question,
  type QuestionOption,
  type SubtestCode,
  type ValidateContext,
} from "@can/shared";
import { and, asc, count, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import type { Db } from "./index.js";
import {
  questionOptions,
  questionRevisions,
  questions,
  ruleSets,
  schools,
  subTopics,
  subtests,
  type QuestionStatus,
} from "./web-schema.js";

export class BankError extends Error {}

/** Transisi status yang diizinkan. Soal tidak pernah dihapus, hanya diarsipkan. */
const TRANSITIONS: Record<QuestionStatus, QuestionStatus[]> = {
  draft: ["review", "archived"],
  review: ["draft", "published", "archived"],
  published: ["draft", "archived"],
  archived: ["draft"],
};

export interface QuestionRow extends Question {
  id: string;
  status: QuestionStatus;
  version: number;
  updatedAt: Date;
}

export interface ListFilter {
  subtest?: SubtestCode;
  subTopic?: string;
  status?: QuestionStatus;
  difficulty?: 1 | 2 | 3;
  search?: string;
  limit?: number;
  offset?: number;
}

/** Bentuk pembanding isi soal (tanpa metadata) untuk mendeteksi perubahan. */
const contentKey = (q: Question) =>
  JSON.stringify({
    s: q.subtest,
    t: q.subTopic,
    d: q.difficulty,
    st: q.stem,
    i: q.image,
    o: q.options.map((o) => [o.label, o.text, o.correct ?? null, o.weight ?? null]),
    e: q.explanation,
    qe: q.quizExplanation,
    aq: q.allowQuiz,
    src: q.source,
  });

export class BankRepo {
  constructor(private readonly db: Db) {}

  /** Mengisi data referensi bawaan (idempoten): subtes, sub-materi, sekolah, aturan SKD. */
  async seedReferenceData(): Promise<void> {
    await this.db
      .insert(subtests)
      .values(
        SUBTEST_CODES.map((code, i) => ({
          code,
          name: SUBTESTS[code].name,
          scoringType: SUBTESTS[code].scoring,
          sortOrder: i + 1,
        })),
      )
      .onConflictDoNothing();
    await this.db
      .insert(subTopics)
      .values(
        DEFAULT_SUB_TOPICS.map((t) => ({ subtestCode: t.subtest, slug: t.slug, name: t.name })),
      )
      .onConflictDoNothing();
    await this.db.insert(schools).values(DEFAULT_SCHOOLS).onConflictDoNothing();
    const [{ n } = { n: 0 }] = await this.db.select({ n: count() }).from(ruleSets);
    if (n === 0) {
      await this.db.insert(ruleSets).values({
        name: DEFAULT_RULE_SET.name,
        durationMinutes: DEFAULT_RULE_SET.durationMinutes,
        config: DEFAULT_RULE_SET.config,
        sourceNote: DEFAULT_RULE_SET.sourceNote,
        status: "active",
      });
    }
  }

  /** Konteks validasi dari sub-materi aktif di DB. */
  async validateContext(images?: Set<string>): Promise<ValidateContext> {
    const rows = await this.db
      .select({ slug: subTopics.slug, subtest: subTopics.subtestCode })
      .from(subTopics)
      .where(eq(subTopics.active, true));
    return contextFromTopics(
      rows.map((r) => ({ slug: r.slug, subtest: r.subtest as SubtestCode })),
      images,
    );
  }

  /**
   * Menyimpan soal hasil impor dalam SATU transaksi. Pemanggil wajib sudah memvalidasi (ImportResult.ok).
   * - kode baru → dibuat sebagai draft
   * - kode lama & isinya berubah → versi lama disalin ke riwayat, versi naik, status kembali draft
   * - kode lama & isinya sama → dilewati
   */
  async importQuestions(items: Question[], by: string | null, now = new Date()) {
    const ctx = await this.validateContext();
    const bad = items
      .flatMap((q, i) => validateQuestion(q, i + 1, ctx))
      .filter((x) => x.level === "error");
    if (bad.length) throw new BankError(`${bad.length} error validasi; impor dibatalkan`);

    const topicIds = await this.topicIdMap();
    return this.db.transaction(async (tx) => {
      const result = { created: 0, updated: 0, unchanged: 0 };
      const codes = items.map((q) => q.code);
      const existing = codes.length
        ? await tx.select().from(questions).where(inArray(questions.code, codes))
        : [];
      const byCode = new Map(existing.map((e) => [e.code, e]));
      const oldFull = await this.loadQuestions(
        existing.map((e) => e.id),
        tx as unknown as Db,
      );
      const oldByCode = new Map(oldFull.map((q) => [q.code, q]));

      for (const q of items) {
        const row = {
          subtestCode: q.subtest,
          subTopicId: topicIds.get(q.subTopic)!,
          difficulty: q.difficulty,
          stem: q.stem,
          imagePath: q.image,
          explanation: q.explanation,
          quizExplanation: q.quizExplanation,
          allowQuiz: q.allowQuiz,
          sourceNote: q.source,
          updatedBy: by,
          updatedAt: now,
        };
        const prev = byCode.get(q.code);
        let questionId: string;
        if (!prev) {
          const [ins] = await tx
            .insert(questions)
            .values({ ...row, code: q.code, status: "draft", createdBy: by, createdAt: now })
            .returning({ id: questions.id });
          questionId = ins!.id;
          result.created++;
        } else {
          const old = oldByCode.get(q.code)!;
          if (contentKey(old) === contentKey(q)) {
            result.unchanged++;
            continue;
          }
          await tx.insert(questionRevisions).values({
            questionId: prev.id,
            version: prev.version,
            snapshot: { ...old, status: prev.status },
            changedBy: by,
            createdAt: now,
          });
          await tx
            .update(questions)
            .set({ ...row, status: "draft", version: prev.version + 1 })
            .where(eq(questions.id, prev.id));
          await tx.delete(questionOptions).where(eq(questionOptions.questionId, prev.id));
          questionId = prev.id;
          result.updated++;
        }
        await tx.insert(questionOptions).values(
          q.options.map((o) => ({
            questionId,
            label: o.label,
            text: o.text,
            isCorrect: q.subtest === "TKP" ? null : o.correct === true,
            weight: q.subtest === "TKP" ? (o.weight ?? null) : null,
          })),
        );
      }
      return result;
    });
  }

  /** Mengubah status. Menerbitkan mewajibkan soal lolos validasi & pembahasan terisi. */
  async setStatus(code: string, to: QuestionStatus, by: string | null, now = new Date()) {
    const [q] = await this.db.select().from(questions).where(eq(questions.code, code)).limit(1);
    if (!q) throw new BankError(`soal ${code} tidak ditemukan`);
    if (q.status === to) return;
    if (!TRANSITIONS[q.status].includes(to)) {
      throw new BankError(`status ${q.status} tidak bisa langsung menjadi ${to}`);
    }
    if (to === "published") {
      const [full] = await this.loadQuestions([q.id]);
      const issues = validateQuestion(full!, 1, await this.validateContext());
      if (issues.some((i) => i.level === "error"))
        throw new BankError("soal masih punya error validasi");
      if (!full!.explanation.trim())
        throw new BankError("pembahasan wajib diisi sebelum diterbitkan");
    }
    await this.db
      .update(questions)
      .set({ status: to, updatedBy: by, updatedAt: now })
      .where(eq(questions.id, q.id));
  }

  async getByCode(code: string): Promise<QuestionRow | undefined> {
    const [q] = await this.db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.code, code))
      .limit(1);
    if (!q) return undefined;
    return (await this.loadQuestions([q.id]))[0];
  }

  async list(f: ListFilter = {}): Promise<{ rows: QuestionRow[]; total: number }> {
    const conds: SQL[] = [];
    if (f.subtest) conds.push(eq(questions.subtestCode, f.subtest));
    if (f.status) conds.push(eq(questions.status, f.status));
    if (f.difficulty) conds.push(eq(questions.difficulty, f.difficulty));
    if (f.subTopic) {
      const id = (await this.topicIdMap()).get(f.subTopic);
      conds.push(eq(questions.subTopicId, id ?? -1));
    }
    if (f.search?.trim()) {
      const pat = `%${f.search.trim().replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
      conds.push(or(ilike(questions.code, pat), ilike(questions.stem, pat))!);
    }
    const where = conds.length ? and(...conds) : undefined;
    const [{ total } = { total: 0 }] = await this.db
      .select({ total: count() })
      .from(questions)
      .where(where);
    const ids = await this.db
      .select({ id: questions.id })
      .from(questions)
      .where(where)
      .orderBy(asc(questions.code))
      .limit(Math.min(f.limit ?? 50, 500))
      .offset(f.offset ?? 0);
    return { rows: await this.loadQuestions(ids.map((r) => r.id)), total };
  }

  /** Semua soal (opsional per status) untuk ekspor/cadangan. */
  async exportAll(status?: QuestionStatus): Promise<QuestionRow[]> {
    const ids = await this.db
      .select({ id: questions.id })
      .from(questions)
      .where(status ? eq(questions.status, status) : undefined)
      .orderBy(asc(questions.code));
    return this.loadQuestions(ids.map((r) => r.id));
  }

  async revisions(code: string) {
    const [q] = await this.db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.code, code))
      .limit(1);
    if (!q) return [];
    return this.db
      .select()
      .from(questionRevisions)
      .where(eq(questionRevisions.questionId, q.id))
      .orderBy(asc(questionRevisions.version));
  }

  /** Ringkasan jumlah soal per subtes & status (untuk dasbor admin). */
  async summary() {
    return this.db
      .select({ subtest: questions.subtestCode, status: questions.status, n: count() })
      .from(questions)
      .groupBy(questions.subtestCode, questions.status);
  }

  // ---------- internal ----------
  private async topicIdMap(): Promise<Map<string, number>> {
    const rows = await this.db.select({ id: subTopics.id, slug: subTopics.slug }).from(subTopics);
    return new Map(rows.map((r) => [r.slug, r.id]));
  }

  private async loadQuestions(ids: string[], db: Db = this.db): Promise<QuestionRow[]> {
    if (ids.length === 0) return [];
    const qs = await db
      .select({ q: questions, slug: subTopics.slug })
      .from(questions)
      .innerJoin(subTopics, eq(subTopics.id, questions.subTopicId))
      .where(inArray(questions.id, ids))
      .orderBy(asc(questions.code));
    const opts = await db
      .select()
      .from(questionOptions)
      .where(inArray(questionOptions.questionId, ids))
      .orderBy(asc(questionOptions.label));
    const byQ = new Map<string, typeof opts>();
    for (const o of opts) byQ.set(o.questionId, [...(byQ.get(o.questionId) ?? []), o]);
    return qs.map(({ q, slug }) => {
      const tkp = q.subtestCode === "TKP";
      const options: QuestionOption[] = (byQ.get(q.id) ?? []).map((o) => {
        const x: QuestionOption = { label: o.label as QuestionOption["label"], text: o.text };
        if (tkp) x.weight = o.weight ?? undefined;
        else x.correct = o.isCorrect === true;
        return x;
      });
      return {
        id: q.id,
        code: q.code,
        subtest: q.subtestCode as SubtestCode,
        subTopic: slug,
        difficulty: q.difficulty as 1 | 2 | 3,
        stem: q.stem,
        image: q.imagePath,
        options,
        explanation: q.explanation,
        quizExplanation: q.quizExplanation,
        allowQuiz: q.allowQuiz,
        source: q.sourceNote,
        status: q.status,
        version: q.version,
        updatedAt: q.updatedAt,
      };
    });
  }
}
