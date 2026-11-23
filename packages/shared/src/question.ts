// Model soal kanonik + validasi. Dipakai impor CSV/JSON, form admin, dan ekspor.
// Semua pesan berbahasa Indonesia karena tampil langsung ke pemilik/admin.
import { OPTION_LABELS, SUBTEST_CODES, type OptionLabel, type SubtestCode } from "./skd.js";

export interface QuestionOption {
  label: OptionLabel;
  text: string;
  /** TWK/TIU: tepat satu true. TKP: undefined. */
  correct?: boolean;
  /** TKP: 1–5, unik. TWK/TIU: undefined. */
  weight?: number;
}

export interface Question {
  code: string;
  subtest: SubtestCode;
  subTopic: string;
  difficulty: 1 | 2 | 3;
  stem: string;
  image: string | null;
  options: QuestionOption[];
  explanation: string;
  quizExplanation: string | null;
  allowQuiz: boolean;
  source: string;
}

export interface Issue {
  /** Nomor baris di file (CSV: baris 2 = soal pertama) atau indeks soal JSON (1-based). */
  row: number;
  code?: string;
  field: string;
  message: string;
  level: "error" | "warning";
}

export const LIMITS = {
  stem: 4000,
  option: 1000,
  explanation: 6000,
  /** Batas Telegram untuk poll tipe quiz. */
  quizQuestion: 300,
  quizOption: 100,
  quizExplanation: 200,
} as const;

/** Kode soal: SUBTES-KELOMPOK-NOMOR, mis. TIU-DRT-0001. Awalan harus sama dengan subtes. */
export const CODE_RE = /^(TWK|TIU|TKP)-[A-Z0-9]{2,8}-\d{3,5}$/;
const IMAGE_RE = /^[\w.\-/]+\.(webp|png|jpe?g)$/i;

/** Klaim yang dilarang brief §7.2 — muncul sebagai peringatan agar dicek manual. */
const FORBIDDEN_CLAIMS = [/bocoran/i, /soal asli/i, /dijamin lulus/i, /pasti lulus/i];

export interface ValidateContext {
  /** slug sub-materi yang dikenal, per subtes. */
  subTopics: Map<string, SubtestCode>;
  /** Nama file gambar yang tersedia; undefined = tidak dicek. */
  images?: Set<string>;
}

/** Memvalidasi satu soal kanonik. Tidak melempar; mengembalikan daftar masalah. */
export function validateQuestion(q: Question, row: number, ctx: ValidateContext): Issue[] {
  const out: Issue[] = [];
  const err = (field: string, message: string) =>
    out.push({ row, code: q.code || undefined, field, message, level: "error" });
  const warn = (field: string, message: string) =>
    out.push({ row, code: q.code || undefined, field, message, level: "warning" });

  if (!CODE_RE.test(q.code)) {
    err("code", `kode "${q.code}" tidak sesuai format, contoh: TIU-DRT-0001`);
  } else if (!q.code.startsWith(`${q.subtest}-`)) {
    err("code", `kode harus diawali ${q.subtest}- sesuai subtes`);
  }
  if (!(SUBTEST_CODES as readonly string[]).includes(q.subtest)) {
    err("subtes", `subtes harus TWK, TIU, atau TKP (tertulis "${q.subtest}")`);
  }
  const topicOwner = ctx.subTopics.get(q.subTopic);
  if (!topicOwner) err("sub_materi", `sub-materi "${q.subTopic}" tidak dikenal`);
  else if (topicOwner !== q.subtest) {
    err("sub_materi", `sub-materi "${q.subTopic}" milik ${topicOwner}, bukan ${q.subtest}`);
  }
  if (![1, 2, 3].includes(q.difficulty)) err("tingkat", "tingkat harus 1, 2, atau 3");

  if (!q.stem.trim()) err("soal", "teks soal kosong");
  if (q.stem.length > LIMITS.stem) err("soal", `teks soal maksimal ${LIMITS.stem} karakter`);

  if (q.image !== null) {
    if (!IMAGE_RE.test(q.image) || q.image.includes("..")) {
      err("gambar", "nama file gambar harus .webp/.png/.jpg tanpa '..'");
    } else if (ctx.images && !ctx.images.has(q.image)) {
      err("gambar", `file gambar "${q.image}" tidak ditemukan`);
    }
  }

  // Opsi A–E
  const labels = q.options.map((o) => o.label);
  if (labels.join("") !== OPTION_LABELS.join("")) err("opsi", "harus tepat 5 opsi A–E");
  q.options.forEach((o) => {
    const f = `opsi_${o.label.toLowerCase()}`;
    if (!o.text.trim()) err(f, `opsi ${o.label} kosong`);
    if (o.text.length > LIMITS.option) err(f, `opsi ${o.label} maksimal ${LIMITS.option} karakter`);
  });
  const texts = q.options.map((o) => o.text.trim().toLowerCase()).filter(Boolean);
  if (new Set(texts).size !== texts.length) err("opsi", "ada opsi yang isinya sama persis");

  if (q.subtest === "TKP") {
    const w = q.options.map((o) => o.weight);
    if (w.some((x) => x === undefined || !Number.isInteger(x) || x < 1 || x > 5)) {
      err("bobot", "TKP: tiap opsi wajib berbobot 1–5, contoh 3|5|1|4|2");
    } else if (new Set(w).size !== w.length) {
      err("bobot", "TKP: bobot 1–5 tidak boleh ada yang sama");
    }
    if (q.options.some((o) => o.correct !== undefined))
      err("kunci", "TKP tidak memakai kunci, kosongkan");
  } else {
    const n = q.options.filter((o) => o.correct === true).length;
    if (n !== 1) err("kunci", `${q.subtest}: harus tepat 1 kunci jawaban (A–E)`);
    if (q.options.some((o) => o.weight !== undefined))
      err("bobot", `${q.subtest} tidak memakai bobot, kosongkan`);
  }

  if (!q.explanation.trim())
    warn("pembahasan", "pembahasan masih kosong (wajib sebelum diterbitkan)");
  if (q.explanation.length > LIMITS.explanation) {
    err("pembahasan", `pembahasan maksimal ${LIMITS.explanation} karakter`);
  }

  if (q.allowQuiz) {
    if (q.subtest === "TKP")
      err("boleh_kuis", "soal TKP tidak bisa jadi kuis Telegram (tidak ada 1 jawaban benar)");
    if (q.image) err("boleh_kuis", "soal bergambar tidak bisa jadi kuis Telegram");
    if (q.stem.length > LIMITS.quizQuestion) {
      err("boleh_kuis", `untuk kuis, teks soal maksimal ${LIMITS.quizQuestion} karakter`);
    }
    if (q.options.some((o) => o.text.length > LIMITS.quizOption)) {
      err("boleh_kuis", `untuk kuis, tiap opsi maksimal ${LIMITS.quizOption} karakter`);
    }
    if (!q.quizExplanation?.trim()) err("pembahasan_kuis", "wajib diisi jika boleh_kuis = ya");
  }
  if (q.quizExplanation && q.quizExplanation.length > LIMITS.quizExplanation) {
    err("pembahasan_kuis", `maksimal ${LIMITS.quizExplanation} karakter (batas Telegram)`);
  }

  if (!q.source.trim())
    err("sumber", 'isi asal soal, mis. "orisinal" atau "dibantu AI, dicek manual"');

  const all = [q.stem, q.explanation, ...q.options.map((o) => o.text)].join(" ");
  if (FORBIDDEN_CLAIMS.some((re) => re.test(all))) {
    warn(
      "soal",
      'mengandung kata "bocoran/soal asli/dijamin lulus": pastikan bukan klaim terlarang',
    );
  }
  return out;
}

/** Cek lintas soal: kode dobel & teks soal kembar. */
export function validateBatch(items: { q: Question; row: number }[]): Issue[] {
  const out: Issue[] = [];
  const byCode = new Map<string, number>();
  const byStem = new Map<string, number>();
  for (const { q, row } of items) {
    const prev = byCode.get(q.code);
    if (prev !== undefined) {
      out.push({
        row,
        code: q.code,
        field: "code",
        message: `kode dobel (sudah dipakai di baris ${prev})`,
        level: "error",
      });
    } else byCode.set(q.code, row);
    const key = q.stem.trim().toLowerCase().replace(/\s+/g, " ");
    const same = byStem.get(key);
    if (key && same !== undefined) {
      out.push({
        row,
        code: q.code,
        field: "soal",
        message: `teks soal sama dengan baris ${same}`,
        level: "warning",
      });
    } else if (key) byStem.set(key, row);
  }
  return out;
}

export function correctLabel(q: Question): OptionLabel | null {
  return q.options.find((o) => o.correct)?.label ?? null;
}
