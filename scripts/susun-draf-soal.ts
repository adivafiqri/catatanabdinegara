// Menyusun draf soal (format penulisan ringkas) menjadi bank soal JSON + CSV siap tinjau/impor.
//   pnpm tsx scripts/susun-draf-soal.ts <folder-draf> <folder-keluaran>
// Format draf (per berkas *.json, berupa array):
//   TWK/TIU: {code, sub, lvl, stem, ok, wrong:[4], exp, quiz?}   → opsi diacak, kunci = posisi "ok"
//   TKP:     {code, sub, lvl, stem, opts:[[teks, bobot] x5], exp} → opsi diacak bersama bobotnya
// Pengacakan memakai seed dari kode soal agar hasil selalu sama (stabil saat dijalankan ulang).
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  DEFAULT_RULE_SET,
  DEFAULT_SUB_TOPICS,
  OPTION_LABELS,
  contextFromTopics,
  coverage,
  importJson,
  toBankJson,
  toCsv,
  type Question,
  type SubtestCode,
} from "@can/shared";

interface DraftChoice {
  code: string;
  sub: string;
  lvl: 1 | 2 | 3;
  stem: string;
  ok: string;
  wrong: string[];
  exp: string;
  quiz?: string;
}
interface DraftTkp {
  code: string;
  sub: string;
  lvl: 1 | 2 | 3;
  stem: string;
  opts: [string, number][];
  exp: string;
}

const SOURCE = "draf dibantu AI (Claude), wajib ditinjau pemilik sebelum terbit";

/** PRNG kecil (mulberry32) dengan seed dari hash FNV-1a kode soal. */
function rng(seedText: string): () => number {
  let h = 2166136261;
  for (const c of seedText) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(items: T[], seed: string): T[] {
  const r = rng(seed);
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function build(d: DraftChoice | DraftTkp): Question {
  const subtest = d.code.slice(0, 3) as SubtestCode;
  const base = {
    code: d.code,
    subtest,
    subTopic: d.sub,
    difficulty: d.lvl,
    stem: d.stem,
    image: null,
    explanation: d.exp,
    source: SOURCE,
  };
  if ("opts" in d) {
    const opts = shuffle(d.opts, d.code);
    return {
      ...base,
      options: opts.map(([text, weight], i) => ({ label: OPTION_LABELS[i]!, text, weight })),
      quizExplanation: null,
      allowQuiz: false,
    };
  }
  const opts = shuffle(
    [{ text: d.ok, correct: true }, ...d.wrong.map((text) => ({ text, correct: false }))],
    d.code,
  );
  return {
    ...base,
    options: opts.map((o, i) => ({ label: OPTION_LABELS[i]!, text: o.text, correct: o.correct })),
    quizExplanation: d.quiz ?? null,
    allowQuiz: Boolean(d.quiz),
  };
}

const [inDir, outDir] = process.argv
  .slice(2)
  .map((p) => resolve(process.env.INIT_CWD ?? process.cwd(), p));
if (!inDir || !outDir) {
  console.error("Pakai: tsx scripts/susun-draf-soal.ts <folder-draf> <folder-keluaran>");
  process.exit(2);
}
const drafts = readdirSync(inDir)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .flatMap((f) => JSON.parse(readFileSync(join(inDir, f), "utf8")) as (DraftChoice | DraftTkp)[]);
const questions = drafts.map(build).sort((a, b) => a.code.localeCompare(b.code));

// Validasi lewat jalur impor yang sama dengan panel admin.
const bank = toBankJson(questions);
const res = importJson(JSON.stringify(bank), contextFromTopics(DEFAULT_SUB_TOPICS));
for (const i of res.issues)
  console.info(
    `${i.level === "error" ? "ERROR" : "peringatan"} ${i.code}: ${i.field} – ${i.message}`,
  );

mkdirSync(outDir, { recursive: true, mode: 0o700 });
writeFileSync(join(outDir, "bank-draf.json"), JSON.stringify(bank, null, 2), { mode: 0o600 });
writeFileSync(join(outDir, "bank-draf.csv"), "﻿" + toCsv(questions), { mode: 0o600 });

const keys: Record<string, number> = {};
for (const q of questions) {
  const k = q.options.find((o) => o.correct)?.label;
  if (k) keys[k] = (keys[k] ?? 0) + 1;
}
const lvls = [1, 2, 3].map((l) => questions.filter((q) => q.difficulty === l).length);
console.info(`\nSoal: ${questions.length}`);
for (const c of coverage(questions, DEFAULT_RULE_SET.config.subtests))
  console.info(`  ${c.code}: ${c.have}/${c.need}`);
console.info(
  `Sebaran kunci TWK/TIU: ${OPTION_LABELS.map((l) => `${l}=${keys[l] ?? 0}`).join(" ")}`,
);
console.info(`Tingkat kesulitan: mudah ${lvls[0]}, sedang ${lvls[1]}, sulit ${lvls[2]}`);
console.info(`Boleh jadi kuis Telegram: ${questions.filter((q) => q.allowQuiz).length}`);
console.info(res.ok ? `\nOK → ${outDir}/bank-draf.{json,csv}` : "\nADA ERROR, perbaiki draf.");
process.exit(res.ok ? 0 : 1);
