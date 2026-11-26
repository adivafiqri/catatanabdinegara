import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULE_SET,
  passingStatus,
  scoreAttempt,
  type ScoredQuestion,
} from "../src/index.js";

const cfg = DEFAULT_RULE_SET.config;
const twk = (id: string, correct: string): ScoredQuestion => ({
  id,
  subtest: "TWK",
  options: Object.fromEntries(
    ["A", "B", "C", "D", "E"].map((l) => [l, { correct: l === correct }]),
  ),
});
const tiu = (id: string, correct: string): ScoredQuestion => ({
  ...twk(id, correct),
  subtest: "TIU",
});
const tkp = (id: string, w: number[]): ScoredQuestion => ({
  id,
  subtest: "TKP",
  options: Object.fromEntries(["A", "B", "C", "D", "E"].map((l, i) => [l, { weight: w[i]! }])),
});

describe("scoreAttempt", () => {
  const qs = [
    twk("t1", "B"),
    twk("t2", "C"),
    tiu("i1", "A"),
    tkp("k1", [3, 5, 1, 4, 2]),
    tkp("k2", [1, 2, 3, 4, 5]),
  ];

  it("benar 5, salah 0, kosong 0; TKP sesuai bobot; kosong TKP 0", () => {
    const r = scoreAttempt(cfg, qs, { t1: "B", t2: "A", i1: "A", k1: "B", k2: null });
    expect(r.perSubtest).toEqual({ TWK: 5, TIU: 5, TKP: 5 });
    expect(r.total).toBe(15);
    expect(r.correctCount).toEqual({ TWK: 1, TIU: 1, TKP: 0 });
    expect(r.answeredCount).toBe(4);
    expect(r.perQuestion).toEqual({ t1: 5, t2: 0, i1: 5, k1: 5, k2: 0 });
  });

  it("label yang tidak ada dianggap kosong (input rusak tidak menambah skor)", () => {
    const r = scoreAttempt(cfg, qs, { t1: "Z", k1: "X" });
    expect(r.total).toBe(0);
    expect(r.answeredCount).toBe(0);
  });

  it("skor maksimal paket penuh = 550", () => {
    const full: ScoredQuestion[] = [
      ...Array.from({ length: 30 }, (_, i) => twk(`a${i}`, "A")),
      ...Array.from({ length: 35 }, (_, i) => tiu(`b${i}`, "A")),
      ...Array.from({ length: 45 }, (_, i) => tkp(`c${i}`, [5, 4, 3, 2, 1])),
    ];
    const ans = Object.fromEntries(full.map((q) => [q.id, "A"]));
    expect(scoreAttempt(cfg, full, ans).perSubtest).toEqual({ TWK: 150, TIU: 175, TKP: 225 });
  });

  it("aturan bisa diubah: salah = -1 (bukan hard-code)", () => {
    const c2 = {
      ...cfg,
      subtests: cfg.subtests.map((s) => (s.code === "TWK" ? { ...s, wrong_points: -1 } : s)),
    };
    expect(scoreAttempt(c2, [twk("t1", "B")], { t1: "A" }).total).toBe(-1);
  });
});

describe("passingStatus", () => {
  it("tidak ditampilkan bila ambang batas belum terverifikasi (bawaan)", () => {
    expect(passingStatus(cfg, { TWK: 100, TIU: 100, TKP: 200 })).toEqual({ shown: false });
  });
  it("ditampilkan bila semua terverifikasi", () => {
    const c2 = {
      ...cfg,
      subtests: cfg.subtests.map((s) => ({ ...s, passing_grade: { value: 65, verified: true } })),
    };
    const r = passingStatus(c2, { TWK: 70, TIU: 60, TKP: 200 });
    expect(r).toEqual({ shown: true, passed: false, detail: { TWK: true, TIU: false, TKP: true } });
  });
});
