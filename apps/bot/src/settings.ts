import { botSettings, type Db } from "@can/db";
import { z } from "zod";
import { DEFAULT_TEXTS } from "./texts.js";

/** Semua pengaturan yang bisa diubah moderator lewat perintah, tanpa deploy ulang. */
export const SettingsSchema = z.object({
  welcomeText: z.string().min(1).max(3000),
  rulesText: z.string().min(1).max(3000),
  materiText: z.string().min(1).max(3000),
  jadwalText: z.string().min(1).max(3000),
  tryoutUrl: z.url(),
  bannedWords: z.array(z.string().min(2).max(60)).max(1000),
  domainWhitelist: z.array(z.string().min(3).max(200)).max(200),
  verifyTimeoutMin: z.number().int().min(1).max(60),
  floodMaxMessages: z.number().int().min(2).max(50),
  floodWindowSeconds: z.number().int().min(2).max(120),
  duplicateMax: z.number().int().min(2).max(20),
  duplicateWindowSeconds: z.number().int().min(10).max(3600),
  newbieHours: z
    .number()
    .int()
    .min(0)
    .max(24 * 14),
  muteHours: z
    .number()
    .int()
    .min(1)
    .max(24 * 30),
  warnResetDays: z.number().int().min(1).max(365),
  noticeTtlSeconds: z.number().int().min(10).max(3600),
  commandTtlSeconds: z.number().int().min(30).max(86400),
});

export type Settings = z.infer<typeof SettingsSchema>;
export type SettingKey = keyof Settings;

export const DEFAULT_SETTINGS: Settings = {
  ...DEFAULT_TEXTS,
  tryoutUrl: "https://catatanabdinegara.site",
  // Hanya frasa khas spammer. Kata umum seperti "joki", "pinjol", "bocoran" sengaja tidak dimasukkan
  // karena anggota justru memakainya untuk saling memperingatkan ("awas joki", "ini bukan bocoran").
  bannedWords: [
    "judi",
    "judol*",
    "slot gacor",
    "maxwin",
    "togel",
    "jasa joki",
    "open joki",
    "terima joki",
    "joki tryout",
    "joki skd",
    "pinjol cair",
    "jual akun",
    "jual bocoran",
    "jual kunci jawaban",
    "open order",
    "airdrop",
  ],
  domainWhitelist: [
    "catatanabdinegara.site",
    "sscasn.bkn.go.id",
    "tiktok.com/@catatan.abdinegara",
    "instagram.com/catatan.abdinegara",
    "lynk.id/catatan.abdinegara",
  ],
  verifyTimeoutMin: 5,
  floodMaxMessages: 5,
  floodWindowSeconds: 10,
  duplicateMax: 3,
  duplicateWindowSeconds: 120,
  newbieHours: 24,
  muteHours: 24,
  warnResetDays: 30,
  noticeTtlSeconds: 60,
  commandTtlSeconds: 300,
};

/**
 * Membaca pengaturan dari DB dengan cache singkat (default 60 dtk).
 * Nilai di DB yang rusak diabaikan (pakai default) agar bot tidak mati karena salah ketik.
 */
export class SettingsStore {
  private cache: { at: number; value: Settings } | null = null;

  constructor(
    private readonly db: Db,
    private readonly ttlMs = 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  async get(): Promise<Settings> {
    if (this.cache && this.now() - this.cache.at < this.ttlMs) return this.cache.value;
    const rows = await this.db.select().from(botSettings);
    const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    for (const r of rows) {
      if (!(r.key in DEFAULT_SETTINGS)) continue;
      const field = SettingsSchema.shape[r.key as SettingKey];
      const parsed = field.safeParse(r.value);
      if (parsed.success) merged[r.key] = parsed.data;
      else console.warn(`[settings] nilai '${r.key}' di DB tidak valid, memakai default`);
    }
    const value = merged as Settings;
    this.cache = { at: this.now(), value };
    return value;
  }

  async set<K extends SettingKey>(key: K, value: Settings[K], by: number | null): Promise<void> {
    const parsed = SettingsSchema.shape[key].parse(value);
    await this.db
      .insert(botSettings)
      .values({ key, value: parsed, updatedBy: by, updatedAt: new Date(this.now()) })
      .onConflictDoUpdate({
        target: botSettings.key,
        set: { value: parsed, updatedBy: by, updatedAt: new Date(this.now()) },
      });
    this.cache = null;
  }
}
