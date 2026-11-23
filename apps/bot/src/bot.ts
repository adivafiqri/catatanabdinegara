import { Bot, type BotConfig, type Context } from "grammy";
import type { Deps } from "./core.js";
import { errText } from "./lib/log.js";
import { registerCommands } from "./handlers/commands.js";
import { registerMemberHandlers } from "./handlers/members.js";
import { registerModeration } from "./handlers/moderation.js";

/** Jenis update yang diminta dari Telegram. chat_member wajib untuk mendeteksi anggota baru. */
export const ALLOWED_UPDATES = [
  "message",
  "edited_message",
  "callback_query",
  "chat_member",
  "my_chat_member",
] as const;

export function createBot(token: string, deps: Deps, config?: BotConfig<Context>): Bot {
  const bot = new Bot(token, config);
  const allowed = new Set(deps.env.ALLOWED_CHAT_IDS);
  const modChat = deps.env.MOD_CHAT_ID;

  // Penjaga PERTAMA: hanya melayani grup yang diizinkan, grup moderator, dan chat pribadi.
  // Mode persiapan (ALLOWED_CHAT_IDS kosong): hanya perintah /id yang diproses, tanpa moderasi.
  bot.use(async (ctx, next) => {
    const chat = ctx.chat;
    if (allowed.size === 0) {
      // Catat ID grup ke log agar pemilik bisa mengisi ALLOWED_CHAT_IDS tanpa harus mengetik /id.
      if (chat && chat.type !== "private") {
        console.info(`[persiapan] terlihat di grup "${chat.title ?? "-"}" dengan ID ${chat.id}`);
      }
      if (/^\/id(@\w+)?(\s|$)/.test(ctx.msg?.text ?? "")) return next();
      return;
    }
    if (!chat) return next();
    if (chat.type === "private" || allowed.has(chat.id) || chat.id === modChat) return next();
    if (chat.type === "group" || chat.type === "supergroup") {
      console.warn(`[guard] bot dimasukkan ke grup tak dikenal ${chat.id}, keluar.`);
      try {
        await ctx.api.leaveChat(chat.id);
      } catch {
        // abaikan
      }
    }
  });

  // /id: menampilkan ID pengguna (chat pribadi) atau ID grup. Dipakai saat menyiapkan .env.
  bot.command("id", async (ctx) => {
    if (ctx.chat.type === "private") {
      await ctx.reply(`ID Telegram kamu: <code>${ctx.from?.id}</code>`, { parse_mode: "HTML" });
    } else {
      await ctx.reply(`ID grup ini: <code>${ctx.chat.id}</code>`, { parse_mode: "HTML" });
    }
  });

  // Perubahan admin grup: segarkan cache moderator.
  bot.on("chat_member", async (ctx, next) => {
    const st = [ctx.chatMember.old_chat_member.status, ctx.chatMember.new_chat_member.status];
    if (st.includes("administrator") || st.includes("creator")) deps.mods.invalidate(ctx.chat.id);
    return next();
  });

  // Di chat pribadi & grup moderator hanya perintah yang diproses; moderasi hanya di grup utama.
  registerMemberHandlers(
    bot.filter((ctx) => !!ctx.chat && allowed.has(ctx.chat.id)),
    deps,
  );
  registerModeration(
    bot.filter((ctx) => !!ctx.chat && allowed.has(ctx.chat.id)),
    deps,
  );
  registerCommands(bot, deps);

  bot.catch((err) => {
    console.error(
      `[bot] error saat memproses update ${err.ctx.update.update_id}:`,
      errText(err.error),
    );
  });
  return bot;
}
