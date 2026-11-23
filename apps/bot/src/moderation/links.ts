// Ekstraksi & klasifikasi tautan dalam pesan Telegram.

export interface Entity {
  type: string;
  offset: number;
  length: number;
  url?: string;
}

export interface ParsedLink {
  raw: string;
  host: string;
  path: string;
}

const TELEGRAM_HOSTS = new Set(["t.me", "telegram.me", "telegram.dog"]);

/** Pola tautan yang sering lolos deteksi entity Telegram (disamarkan dengan spasi). */
const OBFUSCATED = [
  /\bt\s*[.,]\s*me\s*\/\s*[+\w]/i,
  /\bwa\s*[.,]\s*me\s*\/\s*\d/i,
  /\bbit\s*[.,]\s*ly\s*\/\s*\w/i,
  /\btg:\/\/join/i,
];
const EXPLICIT_URL = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;

export function parseLink(raw: string): ParsedLink | null {
  const cleaned = raw.trim().replace(/[),.;!?]+$/, "");
  if (/^tg:\/\//i.test(cleaned)) return { raw: cleaned, host: "tg", path: cleaned.slice(5) };
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`);
    const host = u.hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/\.$/, "");
    if (!host.includes(".")) return null;
    let path = u.pathname;
    try {
      path = decodeURIComponent(path);
    } catch {
      // %-encoding rusak: pakai path apa adanya, tautan TETAP dihitung
    }
    return { raw: cleaned, host, path: path.toLowerCase() };
  } catch {
    return null;
  }
}

/** Tautan yang tidak bisa diurai dianggap tautan luar (fail-closed). */
const UNPARSEABLE: Omit<ParsedLink, "raw"> = { host: "tautan-tidak-terbaca.invalid", path: "" };

/** Mengambil semua tautan dari entity Telegram + pola cadangan. */
export function extractLinks(text: string, entities: readonly Entity[] = []): ParsedLink[] {
  const raws: string[] = [];
  const strict = new Set<string>();
  for (const e of entities) {
    const r =
      e.type === "url"
        ? text.slice(e.offset, e.offset + e.length)
        : e.type === "text_link" && e.url
          ? e.url
          : null;
    if (r !== null) {
      raws.push(r);
      strict.add(r);
    }
  }
  for (const m of text.matchAll(EXPLICIT_URL)) raws.push(m[0]);
  const out: ParsedLink[] = [];
  const seen = new Set<string>();
  for (const r of raws) {
    // Entity dari Telegram pasti tautan: jika gagal diurai, tetap dianggap tautan luar.
    const p = parseLink(r) ?? (strict.has(r) ? { raw: r, ...UNPARSEABLE } : null);
    if (p && !seen.has(p.host + p.path)) {
      seen.add(p.host + p.path);
      out.push(p);
    }
  }
  return out;
}

export function hasObfuscatedLink(text: string): boolean {
  return OBFUSCATED.some((re) => re.test(text));
}

export function isInviteLink(l: ParsedLink): boolean {
  if (l.host === "tg") return /^join/i.test(l.path);
  if (!TELEGRAM_HOSTS.has(l.host)) return false;
  return /^\/(\+|joinchat\/|addlist\/)/.test(l.path);
}

/**
 * Entri whitelist berupa domain ("abdinegara.site", berlaku juga untuk subdomain)
 * atau domain + awalan path ("tiktok.com/@catatan.abdinegara").
 */
export function isWhitelisted(l: ParsedLink, whitelist: readonly string[]): boolean {
  return whitelist.some((entry) => {
    const e = entry
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "");
    if (!e) return false;
    const slash = e.indexOf("/");
    const domain = slash === -1 ? e : e.slice(0, slash);
    const prefix = slash === -1 ? "" : e.slice(slash).replace(/\/+$/, "");
    const hostOk = l.host === domain || l.host.endsWith(`.${domain}`);
    if (!hostOk) return false;
    if (!prefix) return true;
    return l.path === prefix || l.path.startsWith(`${prefix}/`);
  });
}
