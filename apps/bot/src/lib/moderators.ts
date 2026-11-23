import { errText } from "./log.js";
import type { Api } from "grammy";

/** ID akun Telegram "GroupAnonymousBot" yang mewakili admin anonim. */
export const ANONYMOUS_ADMIN_ID = 1087968824;

/**
 * Menentukan moderator: admin/pemilik grup (dicek ke Telegram, di-cache 5 menit)
 * atau ID di MODERATOR_IDS. Tidak pernah berdasarkan username (bisa diganti siapa saja).
 */
export class ModeratorCheck {
  private readonly cache = new Map<number, { at: number; ids: Set<number> }>();

  constructor(
    private readonly api: Api,
    private readonly extraIds: readonly number[],
    private readonly ttlMs = 5 * 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  async adminIds(chatId: number): Promise<Set<number>> {
    const c = this.cache.get(chatId);
    if (c && this.now() - c.at < this.ttlMs) return c.ids;
    try {
      const admins = await this.api.getChatAdministrators(chatId);
      const ids = new Set(admins.map((a) => a.user.id));
      this.cache.set(chatId, { at: this.now(), ids });
      return ids;
    } catch (e) {
      // Gagal (mis. 429): pakai daftar lama jika ada, dan jangan bertanya lagi selama 30 dtk.
      const ids = c?.ids ?? new Set<number>();
      this.cache.set(chatId, { at: this.now() - this.ttlMs + 30_000, ids });
      throw e;
    }
  }

  async isModerator(chatId: number, userId: number): Promise<boolean> {
    if (this.extraIds.includes(userId)) return true;
    try {
      return (await this.adminIds(chatId)).has(userId);
    } catch (e) {
      console.error("[moderators] gagal mengambil daftar admin:", errText(e));
      return this.cache.get(chatId)?.ids.has(userId) ?? false;
    }
  }

  invalidate(chatId: number): void {
    this.cache.delete(chatId);
  }
}
