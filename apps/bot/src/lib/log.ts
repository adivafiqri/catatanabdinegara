// Pencatatan error yang aman: token bot tidak boleh ikut tercetak (KEAMANAN.md §5).
// Error jaringan grammY menyimpan URL ".../bot<TOKEN>/method" di error bertingkat (cause).

const TOKEN_RE = /bot\d{3,}:[A-Za-z0-9_-]{10,}/g;
const BARE_TOKEN_RE = /\b\d{6,}:[A-Za-z0-9_-]{30,}\b/g;

export function redact(s: string): string {
  return s.replace(TOKEN_RE, "bot<TOKEN>").replace(BARE_TOKEN_RE, "<TOKEN>");
}

/** Ringkasan error satu baris (termasuk cause) tanpa token. */
export function errText(e: unknown): string {
  const parts: string[] = [];
  let cur: unknown = e;
  for (let i = 0; i < 4 && cur; i++) {
    parts.push(cur instanceof Error ? `${cur.name}: ${cur.message}` : String(cur));
    cur =
      cur instanceof Error
        ? ((cur as Error & { cause?: unknown }).cause ?? (cur as { error?: unknown }).error)
        : undefined;
  }
  return redact(parts.join(" <- ")).slice(0, 1000);
}

export const logError = (tag: string, e: unknown) => console.error(`[${tag}]`, errText(e));
