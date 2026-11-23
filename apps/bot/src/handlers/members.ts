import { errText } from "../lib/log.js";
import type { Composer, Context } from "grammy";
import type { ChatMember } from "grammy/types";
import {
  NO_PERMISSIONS,
  restoreMember,
  safeDelete,
  secondsFromNow,
  sendNotice,
  type Deps,
} from "../core.js";
import { T, escapeHtml, fill, mention } from "../texts.js";

const isIn = (m: ChatMember) =>
  m.status === "member" ||
  m.status === "administrator" ||
  m.status === "creator" ||
  (m.status === "restricted" && m.is_member);

export function registerMemberHandlers(bot: Composer<Context>, deps: Deps) {
  // Pesan sistem "X bergabung / keluar" dihapus agar grup tetap rapi.
  bot.on(["message:new_chat_members", "message:left_chat_member"], async (ctx) => {
    await safeDelete(ctx.api, ctx.chat.id, ctx.msg.message_id);
  });

  // Anggota baru: perlu update chat_member (bot harus admin & allowed_updates memuat chat_member).
  bot.on("chat_member", async (ctx) => {
    const upd = ctx.chatMember;
    const joined = !isIn(upd.old_chat_member) && isIn(upd.new_chat_member);
    if (!joined) return;
    const user = upd.new_chat_member.user;
    if (user.is_bot) return;
    if (upd.new_chat_member.status === "administrator" || upd.new_chat_member.status === "creator")
      return;
    await startVerification(ctx, deps, ctx.chat.id, user);
  });

  bot.callbackQuery(/^v:(\d+)$/, async (ctx) => {
    const targetId = Number(ctx.match[1]);
    const chatId = ctx.chat?.id;
    if (chatId === undefined) return;
    if (ctx.from.id !== targetId) {
      await ctx.answerCallbackQuery({ text: T.verifyOnlyForTarget, show_alert: true });
      return;
    }
    const pending = await deps.repo.getPending(chatId, targetId);
    if (!pending) {
      await ctx.answerCallbackQuery({ text: T.verifyNotPending, show_alert: true });
      return;
    }
    // Buka izin DULU. Data pending baru dihapus setelah berhasil, supaya kegagalan sesaat
    // tidak membuat anggota terkunci selamanya (tombol bisa ditekan lagi / tick tetap menindak).
    try {
      await restoreMember(ctx.api, deps, chatId, targetId);
    } catch (e) {
      console.error("[verify] gagal membuka izin:", errText(e));
      await ctx.answerCallbackQuery({ text: T.verifyRetry, show_alert: true });
      return;
    }
    if (!(await deps.repo.takePending(chatId, targetId))) {
      await ctx.answerCallbackQuery({ text: T.verifyNotPending });
      return;
    }
    const now = deps.now();
    await deps.repo.upsertMember(chatId, ctx.from, now, { verifiedAt: now });
    await deps.repo.logAction({ chatId, action: "verify_ok", target: targetId, now });
    await ctx.answerCallbackQuery({ text: T.verifyOk });
    await safeDelete(ctx.api, chatId, pending.messageId);

    // Sapaan singkat; sapaan sebelumnya dihapus agar hanya 1 yang tampil.
    try {
      const m = await ctx.api.sendMessage(
        chatId,
        fill(T.verifiedWelcome, { nama: mention(ctx.from) }),
        {
          parse_mode: "HTML",
        },
      );
      const prev = await deps.repo.swapLastWelcome(chatId, m.message_id, now);
      if (prev && prev !== m.message_id) await safeDelete(ctx.api, chatId, prev);
    } catch (e) {
      console.error("[verify] gagal kirim sapaan:", errText(e));
    }
  });
}

export async function startVerification(
  ctx: Context,
  deps: Deps,
  chatId: number,
  user: { id: number; first_name: string; username?: string },
) {
  const s = await deps.settings.get();
  const now = deps.now();
  await deps.repo.upsertMember(chatId, user, now, { joinedAt: now, verifiedAt: null });
  // Masuk lagi sebelum sempat verifikasi: hapus sapaan lama agar tidak menumpuk.
  const old = await deps.repo.getPending(chatId, user.id);
  if (old) await safeDelete(ctx.api, chatId, old.messageId);
  try {
    await ctx.api.restrictChatMember(chatId, user.id, NO_PERMISSIONS, {
      use_independent_chat_permissions: true,
    });
  } catch (e) {
    console.error("[join] gagal membatasi anggota baru (bot admin?):", errText(e));
    return;
  }
  const text = fill(s.welcomeText, {
    nama: mention(user),
    menit: s.verifyTimeoutMin,
    tryout_url: escapeHtml(s.tryoutUrl),
  });
  let messageId: number | null = null;
  try {
    const m = await ctx.api.sendMessage(chatId, text, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_markup: {
        inline_keyboard: [[{ text: T.verifyButton, callback_data: `v:${user.id}` }]],
      },
    });
    messageId = m.message_id;
  } catch (e) {
    // Teks sapaan dari moderator mungkin HTML rusak: kirim versi default agar verifikasi tetap jalan.
    console.error("[join] gagal kirim sapaan:", errText(e));
    const m = await sendNotice(
      ctx.api,
      deps,
      chatId,
      `Halo ${mention(user)}, tekan tombol di bawah dalam ${s.verifyTimeoutMin} menit.`,
      s.verifyTimeoutMin * 60 + 30,
    );
    messageId = m?.message_id ?? null;
    if (m) {
      try {
        await ctx.api.editMessageReplyMarkup(chatId, m.message_id, {
          reply_markup: {
            inline_keyboard: [[{ text: T.verifyButton, callback_data: `v:${user.id}` }]],
          },
        });
      } catch (e2) {
        console.error("[join] gagal memasang tombol:", errText(e2));
      }
    }
  }
  await deps.repo.addPending(
    chatId,
    user.id,
    messageId,
    secondsFromNow(now, s.verifyTimeoutMin * 60),
  );
  await deps.repo.logAction({ chatId, action: "verify_start", target: user.id, now });
}
