// Aturan SKD sebagai KONFIGURASI (brief §2, §7.6). Angka bawaan = seleksi terakhir yang diketahui;
// wajib dicek ulang tiap tahun dari pengumuman resmi. Lihat docs/SKEMA-DATA.md §2.
import { z } from "zod";

export const SUBTEST_CODES = ["TWK", "TIU", "TKP"] as const;
export type SubtestCode = (typeof SUBTEST_CODES)[number];

export const SUBTESTS: Record<
  SubtestCode,
  { name: string; scoring: "correct_wrong" | "weighted" }
> = {
  TWK: { name: "Tes Wawasan Kebangsaan", scoring: "correct_wrong" },
  TIU: { name: "Tes Intelegensia Umum", scoring: "correct_wrong" },
  TKP: { name: "Tes Karakteristik Pribadi", scoring: "weighted" },
};

/** Opsi jawaban SKD selalu 5: A–E. */
export const OPTION_LABELS = ["A", "B", "C", "D", "E"] as const;
export type OptionLabel = (typeof OPTION_LABELS)[number];

/** Sub-materi awal (bisa ditambah admin). slug dipakai di file impor. */
export const DEFAULT_SUB_TOPICS: { subtest: SubtestCode; slug: string; name: string }[] = [
  { subtest: "TWK", slug: "twk-nasionalisme", name: "Nasionalisme" },
  { subtest: "TWK", slug: "twk-integritas", name: "Integritas" },
  { subtest: "TWK", slug: "twk-bela-negara", name: "Bela negara" },
  { subtest: "TWK", slug: "twk-pancasila", name: "Pancasila" },
  { subtest: "TWK", slug: "twk-uud-1945", name: "UUD 1945" },
  { subtest: "TWK", slug: "twk-nkri", name: "NKRI" },
  { subtest: "TWK", slug: "twk-bhinneka-tunggal-ika", name: "Bhinneka Tunggal Ika" },
  { subtest: "TWK", slug: "twk-bahasa-negara", name: "Bahasa negara" },
  { subtest: "TIU", slug: "tiu-analogi", name: "Analogi" },
  { subtest: "TIU", slug: "tiu-silogisme", name: "Silogisme" },
  { subtest: "TIU", slug: "tiu-deret-angka", name: "Deret angka" },
  { subtest: "TIU", slug: "tiu-soal-cerita", name: "Soal cerita" },
  { subtest: "TIU", slug: "tiu-hitung-cepat", name: "Hitung cepat" },
  { subtest: "TIU", slug: "tiu-figural", name: "Figural (pola gambar)" },
  { subtest: "TKP", slug: "tkp-pelayanan-publik", name: "Pelayanan publik" },
  { subtest: "TKP", slug: "tkp-jejaring-kerja", name: "Jejaring kerja" },
  { subtest: "TKP", slug: "tkp-sosial-budaya", name: "Sosial budaya" },
  { subtest: "TKP", slug: "tkp-teknologi-informasi", name: "Teknologi informasi" },
  { subtest: "TKP", slug: "tkp-profesionalisme", name: "Profesionalisme" },
];

/** Sekolah tujuan (teks saja, tanpa logo). Bisa diubah admin. */
export const DEFAULT_SCHOOLS: { code: string; name: string }[] = [
  { code: "STIS", name: "Politeknik Statistika STIS" },
  { code: "PKN-STAN", name: "PKN STAN" },
  { code: "IPDN", name: "IPDN" },
  { code: "STMKG", name: "STMKG" },
  { code: "POLTEK-SSN", name: "Poltek SSN" },
  { code: "LAINNYA", name: "Lainnya" },
];

const PassingGrade = z.object({
  value: z.number().int().min(0),
  /** false = belum dikonfirmasi dari aturan resmi → web TIDAK menampilkan "aman/belum aman". */
  verified: z.boolean(),
});

const CorrectWrongSubtest = z.object({
  code: z.enum(["TWK", "TIU"]),
  question_count: z.number().int().min(1).max(200),
  correct_points: z.number().int().min(0).max(100),
  wrong_points: z.number().int().min(-100).max(100),
  blank_points: z.number().int().min(-100).max(100),
  passing_grade: PassingGrade.nullable(),
});

const WeightedSubtest = z.object({
  code: z.literal("TKP"),
  question_count: z.number().int().min(1).max(200),
  weight_min: z.number().int().min(0).max(10),
  weight_max: z.number().int().min(1).max(10),
  blank_points: z.number().int().min(-100).max(100),
  passing_grade: PassingGrade.nullable(),
});

export const RuleSetConfigSchema = z
  .object({
    subtests: z.array(z.union([CorrectWrongSubtest, WeightedSubtest])).min(1),
    total_passing_grade: PassingGrade.nullable(),
    order: z.array(z.enum(SUBTEST_CODES)).min(1),
    shuffle_questions: z.enum(["none", "within_subtest", "all"]),
    shuffle_options: z.boolean(),
    /** Selesai lebih cepat dari ini → ditandai janggal (anti-curang). */
    min_plausible_seconds: z.number().int().min(0),
  })
  .superRefine((c, ctx) => {
    const codes = c.subtests.map((s) => s.code);
    if (new Set(codes).size !== codes.length) {
      ctx.addIssue({
        code: "custom",
        message: "kode subtes tidak boleh dobel",
        path: ["subtests"],
      });
    }
    if ([...c.order].sort().join() !== [...codes].sort().join()) {
      ctx.addIssue({
        code: "custom",
        message: "urutan harus memuat semua subtes tepat sekali",
        path: ["order"],
      });
    }
    for (const s of c.subtests) {
      if (s.code === "TKP" && s.weight_min > s.weight_max) {
        ctx.addIssue({ code: "custom", message: "weight_min > weight_max", path: ["subtests"] });
      }
    }
  });

export type RuleSetConfig = z.infer<typeof RuleSetConfigSchema>;

export interface RuleSet {
  name: string;
  durationMinutes: number;
  config: RuleSetConfig;
  sourceNote: string;
}

/**
 * Aturan bawaan "SKD Sekolah Kedinasan 2026" dari brief: 110 soal, 100 menit.
 * Ambang batas sengaja null (belum dikonfirmasi resmi) → status aman/belum aman tidak ditampilkan.
 */
export const DEFAULT_RULE_SET: RuleSet = {
  name: "SKD Sekolah Kedinasan 2026",
  durationMinutes: 100,
  sourceNote:
    "Dari brief pemilik (aturan seleksi 2026). Cek ulang pengumuman resmi tiap tahun sebelum dipakai.",
  config: {
    subtests: [
      {
        code: "TWK",
        question_count: 30,
        correct_points: 5,
        wrong_points: 0,
        blank_points: 0,
        passing_grade: null,
      },
      {
        code: "TIU",
        question_count: 35,
        correct_points: 5,
        wrong_points: 0,
        blank_points: 0,
        passing_grade: null,
      },
      {
        code: "TKP",
        question_count: 45,
        weight_min: 1,
        weight_max: 5,
        blank_points: 0,
        passing_grade: null,
      },
    ],
    total_passing_grade: null,
    order: ["TWK", "TIU", "TKP"],
    shuffle_questions: "within_subtest",
    shuffle_options: true,
    min_plausible_seconds: 900,
  },
};

export function totalQuestions(c: RuleSetConfig): number {
  return c.subtests.reduce((n, s) => n + s.question_count, 0);
}

/** Skor maksimal per subtes (untuk tampilan "95 / 150"). */
export function maxScore(s: RuleSetConfig["subtests"][number]): number {
  return s.code === "TKP" ? s.question_count * s.weight_max : s.question_count * s.correct_points;
}
