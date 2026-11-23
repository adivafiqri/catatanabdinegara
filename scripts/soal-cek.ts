// Cek file soal (CSV dari Google Sheets atau JSON) TANPA menyimpan apa pun.
//   pnpm soal:cek soal.csv
//   pnpm soal:cek soal.csv --gambar ./gambar     (cek juga keberadaan file gambar)
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, resolve } from "node:path";
import {
  DEFAULT_RULE_SET,
  DEFAULT_SUB_TOPICS,
  contextFromTopics,
  coverage,
  importCsv,
  importJson,
} from "@can/shared";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const gi = args.indexOf("--gambar");
const imgDir = gi >= 0 ? args[gi + 1] : undefined;

if (!file) {
  console.error("Pakai: pnpm soal:cek <file.csv|file.json> [--gambar <folder>]");
  process.exit(2);
}
const path = resolve(process.env.INIT_CWD ?? process.cwd(), file);
if (!existsSync(path)) {
  console.error(`File tidak ditemukan: ${path}`);
  process.exit(2);
}

let images: Set<string> | undefined;
if (imgDir) {
  const dir = resolve(process.env.INIT_CWD ?? process.cwd(), imgDir);
  images = new Set(existsSync(dir) ? readdirSync(dir) : []);
}
const ctx = contextFromTopics(DEFAULT_SUB_TOPICS, images);
const content = readFileSync(path, "utf8");
const r =
  extname(path).toLowerCase() === ".json" ? importJson(content, ctx) : importCsv(content, ctx);

const errs = r.issues.filter((i) => i.level === "error");
const warns = r.issues.filter((i) => i.level === "warning");
const fmt = (i: (typeof r.issues)[number]) =>
  `  baris ${i.row}${i.code ? ` (${i.code})` : ""} · ${i.field}: ${i.message}`;

console.info(`\nFile: ${path}`);
console.info(`Soal terbaca: ${r.questions.length}`);
if (errs.length)
  console.info(
    `\nERROR (${errs.length}) — harus diperbaiki sebelum impor:\n${errs.map(fmt).join("\n")}`,
  );
if (warns.length)
  console.info(
    `\nPeringatan (${warns.length}) — boleh diimpor, tapi cek lagi:\n${warns.map(fmt).join("\n")}`,
  );

console.info("\nKelengkapan untuk 1 paket SKD (110 soal):");
for (const c of coverage(r.questions, DEFAULT_RULE_SET.config.subtests)) {
  const bar = c.missing === 0 ? "lengkap" : `kurang ${c.missing}`;
  console.info(`  ${c.code}: ${c.have}/${c.need} (${bar})`);
}
const per = new Map<string, number>();
for (const q of r.questions) per.set(q.subTopic, (per.get(q.subTopic) ?? 0) + 1);
console.info("\nPer sub-materi:");
for (const t of DEFAULT_SUB_TOPICS) console.info(`  ${t.slug}: ${per.get(t.slug) ?? 0}`);

console.info(
  r.ok ? "\nHASIL: SIAP DIIMPOR ✔" : "\nHASIL: BELUM BISA DIIMPOR ✘ (perbaiki error di atas)",
);
process.exit(r.ok ? 0 : 1);
