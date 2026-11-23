import { normalizeText } from "./normalize.js";

export interface FloodRules {
  maxMessages: number;
  windowSeconds: number;
  duplicateMax: number;
  duplicateWindowSeconds: number;
}

export type FloodResult = "ok" | "flood" | "duplicate" | "flood_repeat";

interface Track {
  times: number[];
  texts: { t: number; key: string }[];
  flaggedUntil: number;
}

/**
 * Pelacak flood di memori (hilang saat restart, dan itu tidak masalah).
 * Hanya pesan pertama yang memicu flood yang diberi peringatan ("flood"/"duplicate");
 * pesan berikutnya dalam jendela yang sama cukup dihapus ("flood_repeat").
 */
export class FloodGuard {
  private readonly tracks = new Map<string, Track>();
  private readonly albums = new Map<string, number>();

  /** true jika pesan ini bagian album yang sudah dihitung (foto ke-2 dst.). */
  seenAlbum(chatId: number, mediaGroupId: string): boolean {
    const k = `${chatId}:${mediaGroupId}`;
    const seen = this.albums.has(k);
    this.albums.set(k, this.now());
    return seen;
  }

  constructor(private readonly now: () => number = Date.now) {}

  check(chatId: number, userId: number, text: string, rules: FloodRules): FloodResult {
    const t = this.now();
    const k = `${chatId}:${userId}`;
    const tr = this.tracks.get(k) ?? { times: [], texts: [], flaggedUntil: 0 };
    this.tracks.set(k, tr);

    const win = rules.windowSeconds * 1000;
    const dupWin = rules.duplicateWindowSeconds * 1000;
    tr.times = tr.times.filter((x) => t - x < win);
    tr.texts = tr.texts.filter((x) => t - x.t < dupWin);
    tr.times.push(t);
    const key = normalizeText(text).trim();
    if (key.length >= 3) tr.texts.push({ t, key });

    let result: FloodResult = "ok";
    if (tr.times.length > rules.maxMessages) result = "flood";
    else if (
      key.length >= 3 &&
      tr.texts.filter((x) => x.key === key).length >= rules.duplicateMax
    ) {
      result = "duplicate";
    }

    if (result === "ok") return "ok";
    if (t < tr.flaggedUntil) return "flood_repeat";
    tr.flaggedUntil = t + Math.max(win, dupWin);
    return result;
  }

  /** Bersihkan pelacak lama agar memori tidak tumbuh terus. */
  sweep(maxAgeMs = 10 * 60_000): void {
    const t = this.now();
    for (const [k, at] of this.albums) if (t - at > maxAgeMs) this.albums.delete(k);
    for (const [k, tr] of this.tracks) {
      const last = Math.max(tr.times.at(-1) ?? 0, tr.texts.at(-1)?.t ?? 0);
      if (t - last > maxAgeMs) this.tracks.delete(k);
    }
  }
}
