// Normalisasi teks untuk mendeteksi kata terlarang yang disamarkan ("J0K1", "j u d i", "sloooot").

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "9": "g",
  "@": "a",
  $: "s",
  "!": "i",
  "|": "i",
};

/**
 * Huruf tunggal yang dipisah spasi/titik/strip digabung: "j u d i" -> "judi", "s.l.o.t" -> "slot".
 * Hanya huruf (bukan angka) agar "a. 7 b. 0" di soal pilihan ganda tidak ikut tergabung.
 */
function joinSpacedLetters(s: string): string {
  return s.replace(/(?:^|(?<=\s))(?:[\p{L}@$!|][\s.\-_*]+){2,}[\p{L}@$!|](?=\s|$)/gu, (m) =>
    m.replace(/[\s.\-_*]+/g, ""),
  );
}

/**
 * Mengubah teks menjadi bentuk kanonik:
 * huruf kecil, tanpa diakritik, angka/simbol pengganti dipetakan ke huruf,
 * huruf berulang diringkas ("gacooor" -> "gacor"), dan dipisah satu spasi antar-token.
 * Hasil selalu diawali & diakhiri spasi agar pencocokan per kata cukup dengan `includes`.
 */
export function normalizeText(input: string): string {
  let s = input.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
  s = joinSpacedLetters(s);
  s = s.replace(/[0-9]/g, (c) => LEET[c] ?? c);
  // Simbol hanya dianggap huruf bila diikuti huruf/angka ("$lot", "j!di"), bukan tanda baca ("Kak!!").
  s = s.replace(/[@$!|](?=[\p{L}\p{N}])/gu, (c) => LEET[c] ?? c);
  s = s.replace(/[^\p{L}\p{N}]+/gu, " ");
  s = s.replace(/(\p{L})\1+/gu, "$1");
  s = s.trim().replace(/\s+/g, " ");
  return ` ${s} `;
}

/**
 * Mencocokkan istilah terlarang pada teks yang sudah dinormalisasi.
 * Istilah boleh frasa ("jual akun") dan boleh diakhiri `*` untuk awalan ("judol*" cocok "judolnya").
 */
export function matchBannedTerm(normalized: string, term: string): boolean {
  const prefix = term.trim().endsWith("*");
  const core = normalizeText(term.replace(/\*+\s*$/, "")).trim();
  if (core.length === 0) return false;
  return prefix ? normalized.includes(` ${core}`) : normalized.includes(` ${core} `);
}

export function findBannedTerm(text: string, terms: readonly string[]): string | null {
  const n = normalizeText(text);
  for (const t of terms) if (matchBannedTerm(n, t)) return t;
  return null;
}
