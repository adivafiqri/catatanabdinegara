/** Ringkasan error satu baris tanpa membocorkan URL database berisi password. */
export function errText(e: unknown): string {
  const s = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  return s.replace(/postgres(ql)?:\/\/[^\s@]+@/g, "postgres://<rahasia>@").slice(0, 500);
}
