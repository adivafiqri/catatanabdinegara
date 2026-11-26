// Penilaian SKD: fungsi murni, dipakai server saat attempt dikumpulkan.
import type { RuleSetConfig, SubtestCode } from "./skd.js";

export interface ScoredQuestion {
  id: string;
  subtest: SubtestCode;
  /** Label asli (A–E) → benar (TWK/TIU) atau bobot (TKP). */
  options: Record<string, { correct?: boolean; weight?: number }>;
}

/** Jawaban peserta dalam label ASLI (sudah dipetakan dari label tampilan). null = kosong. */
export type OriginalAnswers = Record<string, string | null | undefined>;

export interface ScoreResult {
  perSubtest: Record<SubtestCode, number>;
  total: number;
  /** Untuk pembahasan: poin per soal. */
  perQuestion: Record<string, number>;
  correctCount: Record<SubtestCode, number>;
  answeredCount: number;
}

export function scoreAttempt(
  config: RuleSetConfig,
  questions: ScoredQuestion[],
  answers: OriginalAnswers,
): ScoreResult {
  const rules = new Map(config.subtests.map((s) => [s.code, s]));
  const perSubtest = { TWK: 0, TIU: 0, TKP: 0 } as Record<SubtestCode, number>;
  const correctCount = { TWK: 0, TIU: 0, TKP: 0 } as Record<SubtestCode, number>;
  const perQuestion: Record<string, number> = {};
  let answeredCount = 0;

  for (const q of questions) {
    const rule = rules.get(q.subtest);
    if (!rule) throw new Error(`aturan untuk subtes ${q.subtest} tidak ada`);
    const chosen = answers[q.id];
    let pts: number;
    if (!chosen || !(chosen in q.options)) {
      pts = rule.blank_points;
    } else {
      answeredCount++;
      const opt = q.options[chosen]!;
      if (rule.code === "TKP") {
        const w = opt.weight;
        if (w === undefined || w < rule.weight_min || w > rule.weight_max) {
          throw new Error(`bobot TKP tidak valid pada soal ${q.id}`);
        }
        pts = w;
      } else if (opt.correct) {
        pts = rule.correct_points;
        correctCount[q.subtest]++;
      } else {
        pts = rule.wrong_points;
      }
    }
    perQuestion[q.id] = pts;
    perSubtest[q.subtest] += pts;
  }
  const total = perSubtest.TWK + perSubtest.TIU + perSubtest.TKP;
  return { perSubtest, total, perQuestion, correctCount, answeredCount };
}

/** Status ambang batas: hanya bila nilainya sudah DIKONFIRMASI resmi (verified). */
export function passingStatus(
  config: RuleSetConfig,
  perSubtest: Record<SubtestCode, number>,
): { shown: false } | { shown: true; passed: boolean; detail: Record<string, boolean> } {
  const grades = config.subtests.map((s) => [s.code, s.passing_grade] as const);
  if (grades.some(([, g]) => !g || !g.verified)) return { shown: false };
  const detail = Object.fromEntries(grades.map(([c, g]) => [c, perSubtest[c] >= g!.value]));
  return { shown: true, passed: Object.values(detail).every(Boolean), detail };
}
