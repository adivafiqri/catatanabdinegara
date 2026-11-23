// Skema tabel bot (Milestone 1). Lihat docs/SKEMA-DATA.md §7.
// Semua waktu timestamptz (UTC). ID Telegram memakai bigint (mode number aman: < 2^53).
import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Tabel bot ada di schema `bot` (bukan `public`) agar tidak terekspos API otomatis Supabase,
 * dan dimiliki role `bot_rw` sehingga bot tidak punya akses ke tabel web. Lihat docs/runbook/deploy-bot.md.
 */
export const botSchema = pgSchema("bot");

const tgId = (name: string) => bigint(name, { mode: "number" });
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

/** Pengaturan yang bisa diubah moderator tanpa deploy ulang. */
export const botSettings = botSchema.table("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: tgId("updated_by"),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

/** Status per grup: sapaan terakhir (untuk dihapus saat ada sapaan baru). */
export const botChatState = botSchema.table("chat_state", {
  chatId: tgId("chat_id").primaryKey(),
  lastWelcomeMessageId: integer("last_welcome_message_id"),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

/** Anggota yang pernah terlihat di grup. */
export const botMembers = botSchema.table(
  "members",
  {
    chatId: tgId("chat_id").notNull(),
    tgUserId: tgId("tg_user_id").notNull(),
    username: text("username"),
    firstName: text("first_name"),
    joinedAt: ts("joined_at"),
    verifiedAt: ts("verified_at"),
    mutedUntil: ts("muted_until"),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.chatId, t.tgUserId] }),
    index("bot_members_username_idx").on(t.username),
  ],
);

/** Anggota baru yang belum menekan tombol verifikasi. */
export const botPendingVerifications = botSchema.table(
  "pending_verifications",
  {
    chatId: tgId("chat_id").notNull(),
    tgUserId: tgId("tg_user_id").notNull(),
    messageId: integer("message_id"),
    expiresAt: ts("expires_at").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.chatId, t.tgUserId] }),
    index("bot_pending_expires_idx").on(t.expiresAt),
  ],
);

/** Riwayat peringatan. Peringatan yang dibatalkan punya revokedAt. */
export const botWarnings = botSchema.table(
  "warnings",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    chatId: tgId("chat_id").notNull(),
    tgUserId: tgId("tg_user_id").notNull(),
    reason: text("reason").notNull(),
    messageExcerpt: text("message_excerpt"),
    /** null = otomatis oleh bot; selain itu ID Telegram moderator */
    byUserId: tgId("by_user_id"),
    createdAt: ts("created_at").notNull().defaultNow(),
    revokedAt: ts("revoked_at"),
    revokedBy: tgId("revoked_by"),
  },
  (t) => [index("bot_warnings_user_idx").on(t.chatId, t.tgUserId, t.createdAt)],
);

/** Log audit semua tindakan moderasi. */
export const botActions = botSchema.table(
  "actions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    chatId: tgId("chat_id").notNull(),
    action: text("action").notNull(),
    targetUserId: tgId("target_user_id"),
    byUserId: tgId("by_user_id"),
    reason: text("reason"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("bot_actions_created_idx").on(t.createdAt)],
);

/** Pesan bot yang harus dihapus otomatis (pemberitahuan singkat, sapaan kedaluwarsa). */
export const botCleanup = botSchema.table(
  "cleanup",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    chatId: tgId("chat_id").notNull(),
    messageId: integer("message_id").notNull(),
    deleteAt: ts("delete_at").notNull(),
  },
  (t) => [index("bot_cleanup_due_idx").on(t.deleteAt)],
);

/** Posting terjadwal (pengingat, anti-penipuan). Cron dibaca dalam zona Asia/Jakarta. */
export const botScheduledPosts = botSchema.table(
  "scheduled_posts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    chatId: tgId("chat_id").notNull(),
    text: text("text").notNull(),
    cron: text("cron").notNull(),
    nextRunAt: ts("next_run_at").notNull(),
    lastRunAt: ts("last_run_at"),
    active: boolean("active").notNull().default(true),
    createdBy: tgId("created_by"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("bot_scheduled_due_idx").on(t.active, t.nextRunAt)],
);

/** Pesan dari sistem lain (web) untuk dikirim bot. dedupeKey mencegah kiriman ganda. */
export const botOutbox = botSchema.table(
  "outbox",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    chatId: tgId("chat_id").notNull(),
    text: text("text").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    sentAt: ts("sent_at"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
  },
  (t) => [
    uniqueIndex("bot_outbox_dedupe_idx").on(t.dedupeKey),
    index("bot_outbox_pending_idx").on(t.sentAt),
  ],
);
