import type { Api, Context } from "grammy";
import type { ChatPermissions, User } from "grammy/types";
import type { Env } from "./env.js";
import type { Repo } from "./lib/repo.js";
import type { ModeratorCheck } from "./lib/moderators.js";
import { ladderStep, type ViolationReason } from "./moderation/detect.js";
import type { FloodGuard } from "./moderation/flood.js";
import type { Settings, SettingsStore } from "./settings.js";
import { errText } from "./lib/log.js";
import { T, escapeHtml, fill, mention } from "./texts.js";

export interface Deps {
  env: Env;
  repo: Repo;
  settings: SettingsStore;
  mods: ModeratorCheck;
  flood: FloodGuard;
  now: () => Date;
}

export const NO_PERMISSIONS: ChatPermissions = {
  can_send_messages: false,
  can_send_audios: false,
  can_send_documents: false,
  can_send_photos: false,
  can_send_videos: false,
  can_send_video_notes: false,
  can_send_voice_notes: false,
  can_send_polls: false,
  can_send_other_messages: false,
  can_add_web_page_previews: false,
  can_change_info: false,
  can_invite_users: false,
  can_pin_messages: false,
  can_manage_topics: false,
};

const FALLBACK_PERMISSIONS: ChatPermissions = {
  can_send_messages: true,
  can_send_audios: true,
  can_send_documents: true,
  can_send_photos: true,
  can_send_videos: true,
  can_send_video_notes: true,
  can_send_voice_notes: true,
  can_send_polls: true,
  can_send_other_messages: true,
  can_add_web_page_previews: true,
  can_invite_users: true,
};

interface GroupInfo {
  permissions: ChatPermissions;
  linkedChatId: number | null;
}
// Cache per instance API (bukan global) agar beberapa bot/tes dalam satu proses tidak saling memengaruhi.
const infoCaches = new WeakMap<Api, Map<number, { at: number; info: GroupInfo }>>();

/** Info grup (izin bawaan & channel tertaut), di-cache 10 menit. Saat gagal: pakai cache lama. */
export async function groupInfo(api: Api, chatId: number): Promise<GroupInfo> {
  let infoCache = infoCaches.get(api);
  if (!infoCache) infoCaches.set(api, (infoCache = new Map()));
  const c = infoCache.get(chatId);
  if (c && Date.now() - c.at < 10 * 60_000) return c.info;
  try {
    const chat = await api.getChat(chatId);
    const info: GroupInfo = {
      permissions: ("permissions" in chat && chat.permissions) || FALLBACK_PERMISSIONS,
      linkedChatId: ("linked_chat_id" in chat && chat.linked_chat_id) || null,
    };
    infoCache.set(chatId, { at: Date.now(), info });
    return info;
  } catch {
    return c?.info ?? { permissions: FALLBACK_PERMISSIONS, linkedChatId: null };
  }
}

/** Izin bawaan grup, dipakai saat membuka bisu agar sama dengan anggota lain. */
export async function groupPermissions(api: Api, chatId: number): Promise<ChatPermissions> {
  return (await groupInfo(api, chatId)).permissions;
}

export const secondsFromNow = (now: Date, s: number) => new Date(now.getTime() + s * 1000);
export const unixTime = (d: Date) => Math.floor(d.getTime() / 1000);

/** Kirim pesan singkat ke grup yang akan terhapus otomatis setelah TTL. */
export async function sendNotice(
  api: Api,
  deps: Deps,
  chatId: number,
  html: string,
  ttlSec?: number,
) {
  const s = await deps.settings.get();
  try {
    const m = await api.sendMessage(chatId, html, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
    await deps.repo.scheduleDelete(
      chatId,
      m.message_id,
      secondsFromNow(deps.now(), ttlSec ?? s.noticeTtlSeconds),
    );
    return m;
  } catch (e) {
    console.error("[notice] gagal kirim:", errText(e));
    return null;
  }
}

export async function safeDelete(api: Api, chatId: number, messageId: number | null | undefined) {
  if (!messageId) return;
  try {
    await api.deleteMessage(chatId, messageId);
  } catch {
    // pesan sudah terhapus / terlalu lama: abaikan
  }
}

export async function muteMember(
  api: Api,
  deps: Deps,
  chatId: number,
  userId: number,
  hours: number,
) {
  const until = secondsFromNow(deps.now(), hours * 3600);
  await api.restrictChatMember(chatId, userId, NO_PERMISSIONS, {
    until_date: unixTime(until),
    use_independent_chat_permissions: true,
  });
  await deps.repo.upsertMember(chatId, { id: userId }, deps.now(), { mutedUntil: until });
}

export async function unmuteMember(api: Api, deps: Deps, chatId: number, userId: number) {
  await api.restrictChatMember(chatId, userId, await groupPermissions(api, chatId), {
    use_independent_chat_permissions: true,
  });
  const m = await deps.repo.getMember(chatId, userId);
  if (m) await deps.repo.upsertMember(chatId, { id: userId }, deps.now(), { mutedUntil: null });
}

/**
 * Keluarkan tanpa ban permanen: ban lalu unban agar bisa bergabung lagi.
 * Unban dicoba ulang supaya kegagalan sesaat tidak berubah menjadi ban permanen.
 */
export async function kickMember(api: Api, chatId: number, userId: number) {
  await api.banChatMember(chatId, userId);
  let last: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      await api.unbanChatMember(chatId, userId, { only_if_banned: true });
      return;
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  console.error(`[kick] unban gagal, anggota ${userId} masih ter-ban:`, errText(last));
  throw last;
}

/**
 * Mengembalikan izin anggota setelah verifikasi. Jika masih dalam masa bisu
 * (mis. keluar lalu masuk lagi untuk menghindari bisu), bisu dipasang ulang sampai waktunya habis.
 */
export async function restoreMember(api: Api, deps: Deps, chatId: number, userId: number) {
  const m = await deps.repo.getMember(chatId, userId);
  if (m?.mutedUntil && m.mutedUntil.getTime() > deps.now().getTime() + 30_000) {
    await api.restrictChatMember(chatId, userId, NO_PERMISSIONS, {
      until_date: unixTime(m.mutedUntil),
      use_independent_chat_permissions: true,
    });
    return "still_muted" as const;
  }
  await api.restrictChatMember(chatId, userId, await groupPermissions(api, chatId), {
    use_independent_chat_permissions: true,
  });
  return "restored" as const;
}

export function warnWindowStart(deps: Deps, s: Settings): Date {
  return new Date(deps.now().getTime() - s.warnResetDays * 86_400_000);
}

export function reasonText(reason: ViolationReason, s: Settings): string {
  return fill(T.reason[reason], { jam: s.newbieHours });
}

/**
 * Menangani pelanggaran yang sudah terdeteksi: hapus pesan, catat, beri peringatan sesuai tangga,
 * bisukan di pelanggaran ke-3 dan kabari moderator.
 */
export async function handleViolation(
  ctx: Context,
  deps: Deps,
  v: { reason: ViolationReason; warn: boolean; detail?: string | undefined },
  user: User,
  text: string,
) {
  const chatId = ctx.chat!.id;
  const msgId = ctx.msg?.message_id;
  const s = await deps.settings.get();
  const now = deps.now();
  await safeDelete(ctx.api, chatId, msgId);
  const alasan = reasonText(v.reason, s);
  const nama = mention(user);

  await deps.repo.logAction({
    chatId,
    action: "delete",
    target: user.id,
    reason: v.detail ? `${v.reason}:${v.detail}` : v.reason,
    now,
  });

  if (!v.warn) {
    await sendNotice(
      ctx.api,
      deps,
      chatId,
      fill(T.noticeNoWarn, { nama, alasan: escapeHtml(alasan) }),
    );
    return;
  }

  await deps.repo.addWarning({
    chatId,
    userId: user.id,
    reason: v.reason,
    excerpt: text,
    by: null,
    now,
  });
  await deps.repo.logAction({ chatId, action: "warn", target: user.id, reason: v.reason, now });
  const count = await deps.repo.countActiveWarnings(chatId, user.id, warnWindowStart(deps, s));
  await applyLadder(ctx.api, deps, chatId, user, count, alasan);
}

export async function applyLadder(
  api: Api,
  deps: Deps,
  chatId: number,
  user: Pick<User, "id" | "first_name" | "username">,
  count: number,
  alasan: string,
) {
  const s = await deps.settings.get();
  const nama = mention(user);
  const step = ladderStep(count);
  alasan = escapeHtml(alasan);
  if (step === "warn1") {
    await sendNotice(api, deps, chatId, fill(T.noticeWarn1, { nama, alasan }));
    return;
  }
  if (step === "warn2") {
    await sendNotice(api, deps, chatId, fill(T.noticeWarn2, { nama, alasan, bisu: s.muteHours }));
    return;
  }
  try {
    await muteMember(api, deps, chatId, user.id, s.muteHours);
  } catch (e) {
    console.error("[ladder] gagal membisukan:", errText(e));
    return;
  }
  await deps.repo.logAction({
    chatId,
    action: "mute",
    target: user.id,
    reason: "auto:ladder",
    now: deps.now(),
  });
  await sendNotice(api, deps, chatId, fill(T.noticeMuted, { nama, bisu: s.muteHours }));
  await notifyModerators(
    api,
    deps,
    chatId,
    fill(T.modMuted, { nama, id: user.id, alasan, jumlah: count }),
    {
      inline_keyboard: [
        [
          { text: T.modKickBtn, callback_data: `mk:${chatId}:${user.id}` },
          { text: T.modUnmuteBtn, callback_data: `mu:${chatId}:${user.id}` },
        ],
      ],
    },
  );
}

type Keyboard = { inline_keyboard: { text: string; callback_data: string }[][] };

/** Kirim ke grup moderator jika ada; jika tidak, ke grup utama (terhapus otomatis). */
export async function notifyModerators(
  api: Api,
  deps: Deps,
  chatId: number,
  html: string,
  kb?: Keyboard,
) {
  const target = deps.env.MOD_CHAT_ID;
  try {
    if (target) {
      await api.sendMessage(target, html, {
        parse_mode: "HTML",
        ...(kb ? { reply_markup: kb } : {}),
        link_preview_options: { is_disabled: true },
      });
    } else {
      const s = await deps.settings.get();
      const m = await api.sendMessage(chatId, html, {
        parse_mode: "HTML",
        ...(kb ? { reply_markup: kb } : {}),
      });
      await deps.repo.scheduleDelete(
        chatId,
        m.message_id,
        secondsFromNow(deps.now(), s.commandTtlSeconds * 12),
      );
    }
  } catch (e) {
    console.error("[mod] gagal kirim notifikasi:", errText(e));
  }
}
