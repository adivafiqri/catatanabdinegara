import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULE_SET,
  DEFAULT_SUB_TOPICS,
  RuleSetConfigSchema,
  contextFromTopics,
  coverage,
  importCsv,
  importJson,
  maxScore,
  toBankJson,
  toCsv,
  totalQuestions,
} from "../src/index.js";

const ctx = contextFromTopics(DEFAULT_SUB_TOPICS);
const template = readFileSync(
  new URL("../../../docs/templat/templat-soal.csv", import.meta.url),
  "utf8",
);
const HEADER = template.split("\n")[0]!;
const errors = (r: { issues: { level: string; field: string; row: number; message: string }[] }) =>
  r.issues.filter((i) => i.level === "error");

/** Ganti satu kolom pada baris contoh ke-n (1 = TWK, 2 = TIU, 3 = TKP). */
function withField(n: number, field: string, value: string): string {
  const r = importCsv(template, ctx);
  const qs = r.questions.slice(n - 1, n);
  const csv = toCsv(qs).split("\n");
  const cols = HEADER.split(",");
  const idx = cols.indexOf(field);
  // rangkai ulang baris dengan nilai baru
  const cells = splitCsvRow(csv[1]!);
  cells[idx] = /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  return `${HEADER}\n${cells.join(",")}\n`;
}

function splitCsvRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '""';
        i++;
      } else if (c === '"') {
        q = false;
        cur += c;
      } else cur += c;
    } else if (c === '"') {
      q = true;
      cur += c;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

describe("aturan SKD bawaan", () => {
  it("valid, 110 soal, skor maksimal 150/175/225", () => {
    expect(RuleSetConfigSchema.safeParse(DEFAULT_RULE_SET.config).success).toBe(true);
    expect(totalQuestions(DEFAULT_RULE_SET.config)).toBe(110);
    expect(DEFAULT_RULE_SET.config.subtests.map(maxScore)).toEqual([150, 175, 225]);
    expect(DEFAULT_RULE_SET.durationMinutes).toBe(100);
  });
  it("menolak subtes dobel / urutan tidak lengkap", () => {
    const bad = { ...DEFAULT_RULE_SET.config, order: ["TWK", "TIU"] };
    expect(RuleSetConfigSchema.safeParse(bad).success).toBe(false);
  });
});

describe("importCsv", () => {
  it("templat lolos tanpa error", () => {
    const r = importCsv(template, ctx);
    expect(errors(r)).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.questions.map((q) => q.code)).toEqual([
      "TWK-PCS-0001",
      "TIU-DRT-0001",
      "TKP-PLY-0001",
    ]);
    expect(r.questions[2]!.options.map((o) => o.weight)).toEqual([2, 5, 1, 3, 4]);
    expect(r.questions[1]!.options.find((o) => o.correct)?.label).toBe("C");
  });

  it("menerima pemisah titik koma (Excel Indonesia) dan BOM", () => {
    const semi =
      "﻿" + toCsv(importCsv(template, ctx).questions).replace(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g, ";");
    expect(importCsv(semi, ctx).ok).toBe(true);
  });

  it("kolom hilang dilaporkan", () => {
    const r = importCsv("code,subtes\nTWK-A-001,TWK\n", ctx);
    expect(r.ok).toBe(false);
    expect(r.issues[0]!.message).toContain("kolom tidak ada");
  });

  const cases: [string, number, string, string, string][] = [
    ["kunci bukan A–E", 2, "kunci", "F", "kunci"],
    ["TWK tanpa kunci", 1, "kunci", "", "kunci"],
    ["TIU diberi bobot", 2, "bobot", "1|2|3|4|5", "bobot"],
    ["TKP bobot kembar", 3, "bobot", "5|5|1|3|4", "bobot"],
    ["TKP bobot di luar 1–5", 3, "bobot", "0|5|1|3|4", "bobot"],
    ["TKP bobot kurang", 3, "bobot", "5|1|3", "bobot"],
    ["TKP diberi kunci", 3, "kunci", "B", "kunci"],
    ["sub-materi salah subtes", 1, "sub_materi", "tiu-deret-angka", "sub_materi"],
    ["sub-materi tak dikenal", 1, "sub_materi", "twk-ngawur", "sub_materi"],
    ["kode format salah", 1, "code", "TWK1", "code"],
    ["kode beda subtes", 1, "code", "TIU-PCS-0009", "code"],
    ["tingkat 4", 1, "tingkat", "4", "tingkat"],
    ["opsi kosong", 1, "opsi_c", "", "opsi_c"],
    ["sumber kosong", 1, "sumber", "", "sumber"],
    ["kuis tanpa pembahasan_kuis", 1, "pembahasan_kuis", "", "pembahasan_kuis"],
    ["pembahasan_kuis > 200", 1, "pembahasan_kuis", "x".repeat(201), "pembahasan_kuis"],
    ["TKP jadi kuis", 3, "boleh_kuis", "ya", "boleh_kuis"],
    ["gambar ekstensi salah", 2, "gambar", "pola.gif", "gambar"],
    ["gambar path traversal", 2, "gambar", "../rahasia.png", "gambar"],
  ];
  for (const [name, n, field, value, expectField] of cases) {
    it(`error: ${name}`, () => {
      const r = importCsv(withField(n, field, value), ctx);
      expect(r.ok).toBe(false);
      expect(errors(r).map((e) => e.field)).toContain(expectField);
    });
  }

  it("kode dobel = error, soal kembar = peringatan", () => {
    const body = template.split("\n").slice(1).filter(Boolean);
    const dup = `${HEADER}\n${body[0]}\n${body[0]}\n`;
    const r = importCsv(dup, ctx);
    expect(errors(r).some((e) => e.message.includes("kode dobel"))).toBe(true);
    expect(
      r.issues.some((i) => i.level === "warning" && i.message.includes("sama dengan baris")),
    ).toBe(true);
  });

  it("pembahasan kosong hanya peringatan; klaim terlarang diperingatkan", () => {
    const r1 = importCsv(withField(3, "pembahasan", ""), ctx);
    expect(r1.ok).toBe(true);
    expect(r1.issues.some((i) => i.field === "pembahasan" && i.level === "warning")).toBe(true);
    const r2 = importCsv(withField(2, "pembahasan", "Ini bocoran dari tahun lalu"), ctx);
    expect(r2.issues.some((i) => i.message.includes("bocoran"))).toBe(true);
  });

  it("cek keberadaan file gambar bila daftar gambar diberikan", () => {
    const csv = withField(2, "gambar", "TIU-FIG-0001.webp").replace(",ya,", ",tidak,");
    const noImg = importCsv(csv, contextFromTopics(DEFAULT_SUB_TOPICS, new Set()));
    expect(errors(noImg).map((e) => e.field)).toContain("gambar");
    const ok = importCsv(
      csv,
      contextFromTopics(DEFAULT_SUB_TOPICS, new Set(["TIU-FIG-0001.webp"])),
    );
    expect(errors(ok)).toEqual([]);
  });

  it("nomor baris error sesuai baris di spreadsheet", () => {
    const body = template.split("\n").slice(1).filter(Boolean);
    const bad = body[1]!.replace(",C,,", ",Z,,");
    const r = importCsv(`${HEADER}\n${body[0]}\n${bad}\n`, ctx);
    expect(errors(r)[0]!.row).toBe(3);
  });
});

describe("JSON & ekspor", () => {
  it("CSV → JSON → impor ulang menghasilkan soal yang sama", () => {
    const qs = importCsv(template, ctx).questions;
    const json = JSON.stringify(toBankJson(qs));
    const back = importJson(json, ctx);
    expect(back.ok).toBe(true);
    expect(back.questions).toEqual(qs);
    expect(importCsv(toCsv(back.questions), ctx).questions).toEqual(qs);
  });
  it("JSON format salah ditolak dengan pesan jelas", () => {
    expect(importJson("{}", ctx).issues[0]!.field).toBe("format");
    expect(importJson("bukan json", ctx).issues[0]!.message).toContain("JSON tidak valid");
  });
});

describe("coverage", () => {
  it("menghitung kekurangan soal per subtes untuk 1 paket", () => {
    const qs = importCsv(template, ctx).questions;
    const cov = coverage(qs, DEFAULT_RULE_SET.config.subtests);
    expect(cov).toEqual([
      { code: "TWK", have: 1, need: 30, missing: 29 },
      { code: "TIU", have: 1, need: 35, missing: 34 },
      { code: "TKP", have: 1, need: 45, missing: 44 },
    ]);
  });
});
