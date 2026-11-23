import type { Composer, Context } from "grammy";
import type { Message } from "grammy/types";
import { ANONYMOUS_ADMIN_ID } from "../lib/moderators.js";
import { groupInfo, handleViolation, safeDelete, type Deps } from "../core.js";
import { detectViolation } from "../moderation/detect.js";

const MEDIA_KEYS = [
  "photo",
  "video",
  "document",
  "audio",
  "voice",
  "video_note",
  "animation",
  "sticker",
  "contact",
  "location",
  "venue",
  "poll",
  "story",
] as const;

export function messageFacts(msg: Message) {
  const text = msg.text ?? msg.caption ?? "";
  const entities = msg.entities ?? msg.caption_entities ?? [];
  const hasMedia = MEDIA_KEYS.some((k) => k in msg && msg[k as keyof Message] !== undefined);
  const isForwarded = msg.forward_origin !== undefined;
  return { text, entities, hasMedia, isForwarded };
}

export function registerModeration(bot: Composer<Context>, deps: Deps) {
  const handle = async (ctx: Context, next: () => Promise<void>) => {
    const msg = ctx.msg;
    const chat = ctx.chat;
    const from = ctx.from;
    if (!msg || !chat || !from) return next();
    if (msg.new_chat_members || msg.left_chat_member) return next();

    // Posting otomatis dari channel tertaut & admin anonim tidak dimoderasi.
    if (msg.is_automatic_forward) return next();
    if (msg.sender_chat) {
      if (msg.sender_chat.id === chat.id || from.id === ANONYMOUS_ADMIN_ID) return next();
      // Admin membalas "atas nama channel" di grup diskusi channel tertaut: dibiarkan.
      if (msg.sender_chat.id === (await groupInfo(ctx.api, chat.id)).linkedChatId) return next();
      // Pesan atas nama channel lain (modus spam umum): hapus, tidak bisa diberi peringatan.
      await safeDelete(ctx.api, chat.id, msg.message_id);
      await deps.repo.logAction({
        chatId: chat.id,
        action: "delete",
        reason: `foreign_channel:${msg.sender_chat.id}`,
        now: deps.now(),
      });
      return;
    }
    if (from.is_bot) return next();
    if (await deps.mods.isModerator(chat.id, from.id)) return next();

    const s = await deps.settings.get();
    const now = deps.now();
    const member = await deps.repo.getMember(chat.id, from.id);
    if (
      !member ||
      member.username !== (from.username?.toLowerCase() ?? null) ||
      member.firstName !== from.first_name
    ) {
      await deps.repo.upsertMember(chat.id, from, now);
    }
    const joinedAt = member?.joinedAt;
    const isNewbie = !!joinedAt && now.getTime() - joinedAt.getTime() < s.newbieHours * 3600_000;

    const facts = messageFacts(msg);
    const verdict = detectViolation(
      { ...facts, isNewbie },
      { bannedWords: s.bannedWords, domainWhitelist: s.domainWhitelist },
    );
    if (verdict.kind === "violation") {
      await handleViolation(ctx, deps, verdict, from, facts.text);
      return;
    }

    // Pesan yang diedit, dan foto ke-2 dst. dalam satu album, tidak dihitung flood.
    if (ctx.editedMessage) return next();
    if (msg.media_group_id && deps.flood.seenAlbum(chat.id, msg.media_group_id)) return next();
    const f = deps.flood.check(chat.id, from.id, facts.text, {
      maxMessages: s.floodMaxMessages,
      windowSeconds: s.floodWindowSeconds,
      duplicateMax: s.duplicateMax,
      duplicateWindowSeconds: s.duplicateWindowSeconds,
    });
    if (f === "flood_repeat") {
      await safeDelete(ctx.api, chat.id, msg.message_id);
      return;
    }
    if (f === "flood" || f === "duplicate") {
      await handleViolation(ctx, deps, { reason: f, warn: true }, from, facts.text);
      return;
    }
    return next();
  };

  bot.on(["message", "edited_message"], async (ctx, next) => {
    // Perintah tetap dimoderasi (link di dalam /perintah juga terdeteksi), lalu diteruskan.
    await handle(ctx, next);
  });
}
