// Akses data bot. Semua fungsi menerima `now` agar mudah dites dan konsisten.
import {
  botActions,
  botChatState,
  botCleanup,
  botMembers,
  botOutbox,
  botPendingVerifications,
  botScheduledPosts,
  botWarnings,
  type Db,
} from "@can/db";
import { errText } from "./log.js";
import { and, asc, desc, eq, gt, isNull, lt, lte, sql } from "drizzle-orm";

export type Member = typeof botMembers.$inferSelect;

export class Repo {
  constructor(private readonly db: Db) {}

  // ---------- anggota ----------
  async upsertMember(
    chatId: number,
    u: { id: number; username?: string | undefined; first_name?: string | undefined },
    now: Date,
    patch: Partial<Pick<Member, "joinedAt" | "verifiedAt" | "mutedUntil">> = {},
  ): Promise<void> {
    const base = {
      chatId,
      tgUserId: u.id,
      username: u.username?.toLowerCase() ?? null,
      firstName: u.first_name ?? null,
      updatedAt: now,
    };
    await this.db
      .insert(botMembers)
      .values({ ...base, ...patch })
      .onConflictDoUpdate({
        target: [botMembers.chatId, botMembers.tgUserId],
        set: { username: base.username, firstName: base.firstName, updatedAt: now, ...patch },
      });
  }

  async getMember(chatId: number, userId: number): Promise<Member | undefined> {
    const r = await this.db
      .select()
      .from(botMembers)
      .where(and(eq(botMembers.chatId, chatId), eq(botMembers.tgUserId, userId)))
      .limit(1);
    return r[0];
  }

  async findMemberByUsername(chatId: number, username: string): Promise<Member | undefined> {
    const r = await this.db
      .select()
      .from(botMembers)
      .where(
        and(
          eq(botMembers.chatId, chatId),
          eq(botMembers.username, username.replace(/^@/, "").toLowerCase()),
        ),
      )
      .limit(1);
    return r[0];
  }

  // ---------- verifikasi ----------
  async addPending(
    chatId: number,
    userId: number,
    messageId: number | null,
    expiresAt: Date,
  ): Promise<void> {
    await this.db
      .insert(botPendingVerifications)
      .values({ chatId, tgUserId: userId, messageId, expiresAt })
      .onConflictDoUpdate({
        target: [botPendingVerifications.chatId, botPendingVerifications.tgUserId],
        set: { messageId, expiresAt },
      });
  }

  async getPending(chatId: number, userId: number) {
    const r = await this.db
      .select()
      .from(botPendingVerifications)
      .where(
        and(
          eq(botPendingVerifications.chatId, chatId),
          eq(botPendingVerifications.tgUserId, userId),
        ),
      )
      .limit(1);
    return r[0];
  }

  /** Menghapus & mengembalikan data pending (klaim atomik). */
  async takePending(chatId: number, userId: number) {
    const r = await this.db
      .delete(botPendingVerifications)
      .where(
        and(
          eq(botPendingVerifications.chatId, chatId),
          eq(botPendingVerifications.tgUserId, userId),
        ),
      )
      .returning();
    return r[0];
  }

  /**
   * Mengklaim pending yang kedaluwarsa dengan "sewa": expiresAt dimajukan `leaseMs`.
   * Baris baru dihapus (takePending) setelah kick berhasil; jika gagal/crash, otomatis dicoba lagi.
   */
  async leaseExpiredPendings(now: Date, leaseMs = 120_000, limit = 50) {
    return this.db.transaction(async (tx) => {
      const due = await tx
        .select()
        .from(botPendingVerifications)
        .where(lte(botPendingVerifications.expiresAt, now))
        .orderBy(asc(botPendingVerifications.expiresAt))
        .limit(limit)
        .for("update", { skipLocked: true });
      const until = new Date(now.getTime() + leaseMs);
      for (const p of due) {
        await tx
          .update(botPendingVerifications)
          .set({ expiresAt: until })
          .where(
            and(
              eq(botPendingVerifications.chatId, p.chatId),
              eq(botPendingVerifications.tgUserId, p.tgUserId),
            ),
          );
      }
      return due;
    });
  }

  // ---------- sapaan terakhir ----------
  async swapLastWelcome(chatId: number, messageId: number, now: Date): Promise<number | null> {
    const prev = await this.db
      .select()
      .from(botChatState)
      .where(eq(botChatState.chatId, chatId))
      .limit(1);
    await this.db
      .insert(botChatState)
      .values({ chatId, lastWelcomeMessageId: messageId, updatedAt: now })
      .onConflictDoUpdate({
        target: botChatState.chatId,
        set: { lastWelcomeMessageId: messageId, updatedAt: now },
      });
    return prev[0]?.lastWelcomeMessageId ?? null;
  }

  // ---------- peringatan ----------
  async addWarning(w: {
    chatId: number;
    userId: number;
    reason: string;
    excerpt: string | null;
    by: number | null;
    now: Date;
  }): Promise<void> {
    await this.db.insert(botWarnings).values({
      chatId: w.chatId,
      tgUserId: w.userId,
      reason: w.reason,
      messageExcerpt: w.excerpt ? w.excerpt.slice(0, 100) : null,
      byUserId: w.by,
      createdAt: w.now,
    });
  }

  async countActiveWarnings(chatId: number, userId: number, since: Date): Promise<number> {
    const r = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(botWarnings)
      .where(
        and(
          eq(botWarnings.chatId, chatId),
          eq(botWarnings.tgUserId, userId),
          isNull(botWarnings.revokedAt),
          gt(botWarnings.createdAt, since),
        ),
      );
    return r[0]?.n ?? 0;
  }

  /** Membatalkan peringatan aktif terbaru. Mengembalikan true jika ada yang dibatalkan. */
  async revokeLatestWarning(
    chatId: number,
    userId: number,
    since: Date,
    by: number | null,
    now: Date,
  ) {
    const latest = await this.db
      .select({ id: botWarnings.id })
      .from(botWarnings)
      .where(
        and(
          eq(botWarnings.chatId, chatId),
          eq(botWarnings.tgUserId, userId),
          isNull(botWarnings.revokedAt),
          gt(botWarnings.createdAt, since),
        ),
      )
      .orderBy(desc(botWarnings.createdAt), desc(botWarnings.id))
      .limit(1);
    const id = latest[0]?.id;
    if (id === undefined) return false;
    await this.db
      .update(botWarnings)
      .set({ revokedAt: now, revokedBy: by })
      .where(eq(botWarnings.id, id));
    return true;
  }

  async recentWarnings(chatId: number, userId: number, limit = 10) {
    return this.db
      .select()
      .from(botWarnings)
      .where(and(eq(botWarnings.chatId, chatId), eq(botWarnings.tgUserId, userId)))
      .orderBy(desc(botWarnings.createdAt))
      .limit(limit);
  }

  // ---------- log tindakan ----------
  async logAction(a: {
    chatId: number;
    action: string;
    target?: number | null;
    by?: number | null;
    reason?: string | null;
    now: Date;
  }): Promise<void> {
    await this.db.insert(botActions).values({
      chatId: a.chatId,
      action: a.action,
      targetUserId: a.target ?? null,
      byUserId: a.by ?? null,
      reason: a.reason ?? null,
      createdAt: a.now,
    });
  }

  async recentActions(chatId: number, userId: number, limit = 10) {
    return this.db
      .select()
      .from(botActions)
      .where(and(eq(botActions.chatId, chatId), eq(botActions.targetUserId, userId)))
      .orderBy(desc(botActions.createdAt))
      .limit(limit);
  }

  // ---------- hapus otomatis ----------
  async scheduleDelete(chatId: number, messageId: number, at: Date): Promise<void> {
    await this.db.insert(botCleanup).values({ chatId, messageId, deleteAt: at });
  }

  async takeDueDeletes(now: Date, limit = 100) {
    return this.db.transaction(async (tx) => {
      const due = await tx
        .select()
        .from(botCleanup)
        .where(lte(botCleanup.deleteAt, now))
        .orderBy(asc(botCleanup.deleteAt))
        .limit(limit)
        .for("update", { skipLocked: true });
      for (const d of due) await tx.delete(botCleanup).where(eq(botCleanup.id, d.id));
      return due;
    });
  }

  // ---------- posting terjadwal ----------
  async addScheduledPost(p: {
    chatId: number;
    text: string;
    cron: string;
    nextRunAt: Date;
    by: number | null;
  }) {
    const r = await this.db
      .insert(botScheduledPosts)
      .values({
        chatId: p.chatId,
        text: p.text,
        cron: p.cron,
        nextRunAt: p.nextRunAt,
        createdBy: p.by,
      })
      .returning({ id: botScheduledPosts.id });
    return r[0]!.id;
  }

  async listScheduledPosts(chatId: number) {
    return this.db
      .select()
      .from(botScheduledPosts)
      .where(and(eq(botScheduledPosts.chatId, chatId), eq(botScheduledPosts.active, true)))
      .orderBy(asc(botScheduledPosts.id));
  }

  async countScheduledPosts(chatId: number): Promise<number> {
    const r = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(botScheduledPosts)
      .where(eq(botScheduledPosts.chatId, chatId));
    return r[0]?.n ?? 0;
  }

  async deactivateScheduledPost(chatId: number, id: number): Promise<boolean> {
    const r = await this.db
      .update(botScheduledPosts)
      .set({ active: false })
      .where(
        and(
          eq(botScheduledPosts.id, id),
          eq(botScheduledPosts.chatId, chatId),
          eq(botScheduledPosts.active, true),
        ),
      )
      .returning({ id: botScheduledPosts.id });
    return r.length > 0;
  }

  /**
   * Mengklaim posting yang jatuh tempo dan langsung memajukan jadwalnya dalam satu transaksi,
   * sehingga restart atau 2 instance tidak membuat posting terkirim dua kali.
   */
  async claimDuePosts(now: Date, nextRun: (cron: string, after: Date) => Date, limit = 20) {
    return this.db.transaction(async (tx) => {
      const due = await tx
        .select()
        .from(botScheduledPosts)
        .where(and(eq(botScheduledPosts.active, true), lte(botScheduledPosts.nextRunAt, now)))
        .orderBy(asc(botScheduledPosts.nextRunAt))
        .limit(limit)
        .for("update", { skipLocked: true });
      for (const p of due) {
        await tx
          .update(botScheduledPosts)
          .set({ lastRunAt: now, nextRunAt: nextRun(p.cron, now) })
          .where(eq(botScheduledPosts.id, p.id));
      }
      return due;
    });
  }

  // ---------- outbox (pesan dari web) ----------
  async processOutbox(
    now: Date,
    send: (chatId: number, text: string) => Promise<void>,
    limit = 20,
  ) {
    return this.db.transaction(async (tx) => {
      const due = await tx
        .select()
        .from(botOutbox)
        .where(and(isNull(botOutbox.sentAt), lt(botOutbox.attempts, 5)))
        .orderBy(asc(botOutbox.id))
        .limit(limit)
        .for("update", { skipLocked: true });
      for (const m of due) {
        try {
          await send(m.chatId, m.text);
          await tx
            .update(botOutbox)
            .set({ sentAt: now, attempts: m.attempts + 1 })
            .where(eq(botOutbox.id, m.id));
        } catch (e) {
          await tx
            .update(botOutbox)
            .set({ attempts: m.attempts + 1, lastError: errText(e).slice(0, 500) })
            .where(eq(botOutbox.id, m.id));
        }
      }
      return due.length;
    });
  }

  // ---------- retensi ----------
  async purgeOld(now: Date, days = 180): Promise<void> {
    const before = new Date(now.getTime() - days * 86_400_000);
    await this.db
      .update(botWarnings)
      .set({ messageExcerpt: null })
      .where(lt(botWarnings.createdAt, before));
    await this.db.delete(botActions).where(lt(botActions.createdAt, before));
    await this.db.delete(botWarnings).where(lt(botWarnings.createdAt, before));
    // Anggota yang tidak terlihat lagi > `days` hari (data minimal, UU PDP).
    await this.db.delete(botMembers).where(lt(botMembers.updatedAt, before));
  }
}
