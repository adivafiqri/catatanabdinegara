// Impor bank soal dari CSV (Google Sheets) atau JSON. Format: docs/SKEMA-DATA.md §8.
// Prinsip: validasi SEMUA baris dulu; penyimpanan hanya jika tidak ada error (all-or-nothing).
import { parse } from "csv-parse/sync";
import {
  correctLabel,
  validateBatch,
  validateQuestion,
  type Issue,
  type Question,
  type QuestionOption,
  type ValidateContext,
} from "./question.js";
import { OPTION_LABELS, SUBTEST_CODES, type SubtestCode } from "./skd.js";

export const CSV_COLUMNS = [
  "code",
  "subtes",
  "sub_materi",
  "tingkat",
  "soal",
  "gambar",
  "opsi_a",
  "opsi_b",
  "opsi_c",
  "opsi_d",
  "opsi_e",
  "kunci",
  "bobot",
  "pembahasan",
  "pembahasan_kuis",
  "boleh_kuis",
  "sumber",
] as const;

export interface ImportResult {
  questions: Question[];
  issues: Issue[];
  /** true jika tidak ada issue level error. */
  ok: boolean;
}

const finish = (questions: Question[], issues: Issue[]): ImportResult => ({
  questions,
  issues: issues.sort((a, b) => a.row - b.row || a.field.localeCompare(b.field)),
  ok: !issues.some((i) => i.level === "error"),
});

const yes = (v: string) => ["ya", "y", "yes", "true", "1"].includes(v.trim().toLowerCase());

/** Membaca CSV. Menerima pemisah koma atau titik koma (Excel Indonesia) dan BOM. */
export function importCsv(content: string, ctx: ValidateContext): ImportResult {
  const issues: Issue[] = [];
  const firstLine = content.replace(/^﻿/, "").split(/\r?\n/, 1)[0] ?? "";
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  let records: string[][];
  try {
    records = parse(content, {
      bom: true,
      delimiter,
      relax_column_count: true,
      skip_empty_lines: true,
      trim: false,
    }) as string[][];
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return finish(
      [],
      [{ row: 0, field: "file", message: `CSV tidak bisa dibaca: ${msg}`, level: "error" }],
    );
  }
  const header = (records.shift() ?? []).map((h) => h.trim().toLowerCase());
  const missing = CSV_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) {
    return finish(
      [],
      [
        {
          row: 1,
          field: "header",
          message: `kolom tidak ada: ${missing.join(", ")}`,
          level: "error",
        },
      ],
    );
  }
  const col = (r: string[], name: (typeof CSV_COLUMNS)[number]) =>
    (r[header.indexOf(name)] ?? "").trim();

  const items: { q: Question; row: number }[] = [];
  records.forEach((r, i) => {
    const row = i + 2;
    if (r.every((c) => !c.trim())) return;
    const subtest = col(r, "subtes").toUpperCase() as SubtestCode;
    const isTkp = subtest === "TKP";
    const key = col(r, "kunci").toUpperCase();
    const bobotRaw = col(r, "bobot");
    const weights = bobotRaw ? bobotRaw.split(/[|/]/).map((x) => Number(x.trim())) : [];

    if (!isTkp && key && !(OPTION_LABELS as readonly string[]).includes(key)) {
      issues.push({
        row,
        code: col(r, "code"),
        field: "kunci",
        message: `kunci "${key}" harus A–E`,
        level: "error",
      });
    }
    if (isTkp && bobotRaw && weights.length !== 5) {
      issues.push({
        row,
        code: col(r, "code"),
        field: "bobot",
        message: "TKP: tulis 5 angka dipisah |, contoh 3|5|1|4|2",
        level: "error",
      });
    }
    const options: QuestionOption[] = OPTION_LABELS.map((label, idx) => {
      const o: QuestionOption = {
        label,
        text: col(r, `opsi_${label.toLowerCase()}` as (typeof CSV_COLUMNS)[number]),
      };
      if (isTkp) {
        const w = weights[idx];
        if (w !== undefined) o.weight = w;
      } else {
        o.correct = key === label;
        if (bobotRaw) o.weight = Number.NaN; // salah kolom: dilaporkan oleh validator
      }
      return o;
    });
    const tingkat = Number(col(r, "tingkat"));
    const q: Question = {
      code: col(r, "code").toUpperCase(),
      subtest,
      subTopic: col(r, "sub_materi").toLowerCase(),
      difficulty: (Number.isInteger(tingkat) ? tingkat : 0) as 1 | 2 | 3,
      stem: col(r, "soal"),
      image: col(r, "gambar") || null,
      options,
      explanation: col(r, "pembahasan"),
      quizExplanation: col(r, "pembahasan_kuis") || null,
      allowQuiz: yes(col(r, "boleh_kuis")),
      source: col(r, "sumber"),
    };
    if (isTkp && key) {
      issues.push({
        row,
        code: q.code,
        field: "kunci",
        message: "TKP tidak memakai kunci, kosongkan",
        level: "error",
      });
    }
    items.push({ q, row });
  });

  for (const { q, row } of items) issues.push(...validateQuestion(q, row, ctx));
  issues.push(...validateBatch(items));
  if (items.length === 0)
    issues.push({ row: 0, field: "file", message: "tidak ada soal di file", level: "error" });
  return finish(
    items.map((x) => x.q),
    issues,
  );
}

/** Bentuk JSON bank soal (impor/ekspor/cadangan). */
export interface BankJson {
  format: "can-bank-soal";
  version: 1;
  exported_at?: string;
  questions: {
    code: string;
    subtest: string;
    sub_topic: string;
    difficulty: number;
    stem: string;
    image: string | null;
    options: { label: string; text: string; correct?: boolean; weight?: number }[];
    explanation: string;
    quiz_explanation: string | null;
    allow_quiz: boolean;
    source: string;
  }[];
}

export function importJson(content: string, ctx: ValidateContext): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return finish(
      [],
      [{ row: 0, field: "file", message: `JSON tidak valid: ${msg}`, level: "error" }],
    );
  }
  const d = data as Partial<BankJson>;
  if (d?.format !== "can-bank-soal" || d.version !== 1 || !Array.isArray(d.questions)) {
    return finish(
      [],
      [
        {
          row: 0,
          field: "format",
          message: 'harus berisi {"format":"can-bank-soal","version":1,"questions":[...]}',
          level: "error",
        },
      ],
    );
  }
  const items = d.questions.map((raw, i) => {
    const r = (raw ?? {}) as Partial<BankJson["questions"][number]>;
    const opts = Array.isArray(r.options) ? r.options : [];
    const q: Question = {
      code: String(r.code ?? "").toUpperCase(),
      subtest: String(r.subtest ?? "").toUpperCase() as SubtestCode,
      subTopic: String(r.sub_topic ?? "").toLowerCase(),
      difficulty: Number(r.difficulty) as 1 | 2 | 3,
      stem: String(r.stem ?? ""),
      image: r.image ? String(r.image) : null,
      options: opts.map((o) => {
        const x: QuestionOption = {
          label: String(o?.label ?? "").toUpperCase() as QuestionOption["label"],
          text: String(o?.text ?? ""),
        };
        if (o?.correct !== undefined) x.correct = Boolean(o.correct);
        if (o?.weight !== undefined) x.weight = Number(o.weight);
        return x;
      }),
      explanation: String(r.explanation ?? ""),
      quizExplanation: r.quiz_explanation ? String(r.quiz_explanation) : null,
      allowQuiz: Boolean(r.allow_quiz),
      source: String(r.source ?? ""),
    };
    // TWK/TIU: opsi tanpa "correct" berarti salah
    if (q.subtest !== "TKP") q.options.forEach((o) => (o.correct = o.correct === true));
    return { q, row: i + 1 };
  });
  const issues: Issue[] = [];
  for (const { q, row } of items) issues.push(...validateQuestion(q, row, ctx));
  issues.push(...validateBatch(items));
  if (items.length === 0)
    issues.push({ row: 0, field: "file", message: "tidak ada soal di file", level: "error" });
  return finish(
    items.map((x) => x.q),
    issues,
  );
}

export function toBankJson(questions: Question[], exportedAt?: Date): BankJson {
  return {
    format: "can-bank-soal",
    version: 1,
    ...(exportedAt ? { exported_at: exportedAt.toISOString() } : {}),
    questions: questions.map((q) => ({
      code: q.code,
      subtest: q.subtest,
      sub_topic: q.subTopic,
      difficulty: q.difficulty,
      stem: q.stem,
      image: q.image,
      options: q.options.map((o) =>
        q.subtest === "TKP"
          ? { label: o.label, text: o.text, weight: o.weight! }
          : { label: o.label, text: o.text, ...(o.correct ? { correct: true } : {}) },
      ),
      explanation: q.explanation,
      quiz_explanation: q.quizExplanation,
      allow_quiz: q.allowQuiz,
      source: q.source,
    })),
  };
}

/** Kebalikan importCsv, untuk ekspor ke Google Sheets. */
export function toCsv(questions: Question[]): string {
  const esc = (v: string) => (/[",\n\r;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = questions.map((q) => [
    q.code,
    q.subtest,
    q.subTopic,
    String(q.difficulty),
    q.stem,
    q.image ?? "",
    ...q.options.map((o) => o.text),
    q.subtest === "TKP" ? "" : (correctLabel(q) ?? ""),
    q.subtest === "TKP" ? q.options.map((o) => o.weight).join("|") : "",
    q.explanation,
    q.quizExplanation ?? "",
    q.allowQuiz ? "ya" : "tidak",
    q.source,
  ]);
  return [CSV_COLUMNS.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n") + "\n";
}

/** Konteks validasi dari daftar sub-materi bawaan. */
export function contextFromTopics(
  topics: { subtest: SubtestCode; slug: string }[],
  images?: Set<string>,
): ValidateContext {
  return {
    subTopics: new Map(topics.map((t) => [t.slug, t.subtest])),
    ...(images ? { images } : {}),
  };
}

/** Jumlah soal per subtes, dibandingkan dengan kebutuhan aturan SKD (cek kelengkapan paket). */
export function coverage(
  questions: Pick<Question, "subtest">[],
  need: { code: SubtestCode; question_count: number }[],
) {
  const have = Object.fromEntries(SUBTEST_CODES.map((c) => [c, 0])) as Record<SubtestCode, number>;
  for (const q of questions) if (q.subtest in have) have[q.subtest]++;
  return need.map((n) => ({
    code: n.code,
    have: have[n.code],
    need: n.question_count,
    missing: Math.max(0, n.question_count - have[n.code]),
  }));
}
