import { errText } from "../lib/log.js";
import type { CommandContext, Composer, Context } from "grammy";
import {
  applyLadder,
  kickMember,
  muteMember,
  notifyModerators,
  safeDelete,
  secondsFromNow,
  unmuteMember,
  warnWindowStart,
  type Deps,
} from "../core.js";
import { ANONYMOUS_ADMIN_ID } from "../lib/moderators.js";
import { describeCron, formatWib, friendlyToCron, nextRun } from "../lib/schedule.js";
import type { SettingKey, Settings } from "../settings.js";
import { T, escapeHtml, fill, mention } from "../texts.js";

type Ctx = CommandContext<Context>;

/** Angka yang boleh diubah lewat /atur, dengan nama Indonesia. */
const NUMERIC_SETTINGS: Record<string, { key: SettingKey; desc: string }> = {
  verifikasi_menit: { key: "verifyTimeoutMin", desc: "batas waktu tombol verifikasi (menit)" },
  flood_pesan: { key: "floodMaxMessages", desc: "maks. pesan dalam jendela flood" },
  flood_detik: { key: "floodWindowSeconds", desc: "panjang jendela flood (detik)" },
  ulang_maks: { key: "duplicateMax", desc: "maks. pesan sama berulang" },
  ulang_detik: { key: "duplicateWindowSeconds", desc: "jendela pesan berulang (detik)" },
  anggota_baru_jam: { key: "newbieHours", desc: "masa anggota baru tanpa link/media (jam)" },
  bisu_jam: { key: "muteHours", desc: "lama bisu otomatis (jam)" },
  reset_peringatan_hari: { key: "warnResetDays", desc: "peringatan kedaluwarsa setelah (hari)" },
  notifikasi_detik: { key: "noticeTtlSeconds", desc: "pemberitahuan bot terhapus setelah (detik)" },
  perintah_detik: { key: "commandTtlSeconds", desc: "balasan perintah terhapus setelah (detik)" },
};

const TEXT_SETTINGS: Record<string, SettingKey> = {
  sapaan: "welcomeText",
  aturan: "rulesText",
  materi: "materiText",
  jadwal: "jadwalText",
};

const isGroup = (ctx: Context) => ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";

export function registerCommands(bot: Composer<Context>, deps: Deps) {
  const mainGroup = deps.env.ALLOWED_CHAT_IDS[0] ?? 0;

  /** Balasan perintah: di grup, balasan & perintahnya dihapus otomatis agar grup tidak penuh. */
  async function reply(ctx: Ctx, html: string, ttl?: number) {
    const s = await deps.settings.get();
    const m = await ctx.reply(html, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
    if (isGroup(ctx)) {
      const at = secondsFromNow(deps.now(), ttl ?? s.commandTtlSeconds);
      await deps.repo.scheduleDelete(ctx.chat.id, m.message_id, at);
      await deps.repo.scheduleDelete(ctx.chat.id, ctx.msg.message_id, at);
    }
  }

  /** Untuk info sensitif (riwayat, daftar kata): kirim ke grup moderator bila ada. */
  async function replyMod(ctx: Ctx, html: string) {
    const modChat = deps.env.MOD_CHAT_ID;
    if (isGroup(ctx) && modChat && ctx.chat.id !== modChat) {
      await ctx.api.sendMessage(modChat, html, {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });
      await safeDelete(ctx.api, ctx.chat.id, ctx.msg.message_id);
      return;
    }
    const s = await deps.settings.get();
    await reply(ctx, html, s.noticeTtlSeconds * 2);
  }

  // ---------- perintah umum ----------
  bot.command("start", async (ctx) => {
    if (ctx.chat.type !== "private") return;
    await ctx.reply(T.start, { parse_mode: "HTML" });
  });
  bot.command(["aturan", "rules"], async (ctx) =>
    reply(ctx, (await deps.settings.get()).rulesText),
  );
  bot.command("materi", async (ctx) => reply(ctx, (await deps.settings.get()).materiText));
  bot.command("jadwal", async (ctx) => reply(ctx, (await deps.settings.get()).jadwalText));
  bot.command("tryout", async (ctx) => {
    const s = await deps.settings.get();
    await reply(ctx, fill(T.tryout, { tryout_url: escapeHtml(s.tryoutUrl) }));
  });

  // ---------- perintah moderator ----------
  /**
   * Menentukan grup sasaran & memastikan pengirim moderator. Null = tolak.
   * `global`: pengaturan yang berlaku untuk semua grup (kata, domain, teks, angka) hanya boleh
   * diubah oleh moderator grup UTAMA, supaya admin grup lain tidak bisa mengubahnya.
   */
  async function modGuard(ctx: Ctx, opts: { global?: boolean } = {}): Promise<number | null> {
    const chatId = ctx.chat.id;
    const fromGroup = deps.env.ALLOWED_CHAT_IDS.includes(chatId);
    const fromModChat = chatId === deps.env.MOD_CHAT_ID || ctx.chat.type === "private";
    if (!fromGroup && !fromModChat) return null;
    const groupId = fromGroup ? chatId : mainGroup;
    const authGroup = opts.global ? mainGroup : groupId;
    const anon =
      fromGroup &&
      chatId === authGroup &&
      (ctx.msg.sender_chat?.id === chatId || ctx.from?.id === ANONYMOUS_ADMIN_ID);
    if (anon) return groupId;
    if (ctx.from && (await deps.mods.isModerator(authGroup, ctx.from.id))) return groupId;
    if (fromGroup) {
      await safeDelete(ctx.api, chatId, ctx.msg.message_id);
    } else {
      await ctx.reply(T.notModerator);
    }
    return null;
  }

  const actorId = (ctx: Ctx) =>
    ctx.from && ctx.from.id !== ANONYMOUS_ADMIN_ID ? ctx.from.id : null;

  type Target = { id: number; first_name: string; username?: string };
  /** Sasaran dari pesan yang dibalas, @username, atau ID angka di argumen pertama. */
  async function resolveTarget(
    ctx: Ctx,
    groupId: number,
  ): Promise<{ target: Target; rest: string } | null> {
    const args = ctx.match.trim();
    const replied = ctx.msg.reply_to_message;
    const isTopicRoot =
      !!replied &&
      (replied.forum_topic_created !== undefined ||
        (ctx.msg.is_topic_message === true && replied.message_id === ctx.msg.message_thread_id));
    if (replied?.from && !replied.sender_chat && !isTopicRoot && ctx.chat.id === groupId) {
      return { target: replied.from, rest: args };
    }
    const [first = "", ...restParts] = args.split(/\s+/);
    const rest = restParts.join(" ");
    if (first.startsWith("@")) {
      const m = await deps.repo.findMemberByUsername(groupId, first);
      if (!m) {
        await reply(ctx, T.targetNotFound);
        return null;
      }
      return {
        target: {
          id: m.tgUserId,
          first_name: m.firstName ?? first,
          username: m.username ?? undefined,
        },
        rest,
      } as { target: Target; rest: string };
    }
    if (/^\d{3,}$/.test(first)) {
      const m = await deps.repo.getMember(groupId, Number(first));
      return { target: { id: Number(first), first_name: m?.firstName ?? first }, rest };
    }
    await reply(ctx, T.needTarget);
    return null;
  }

  /** Menjalankan tindakan Telegram; jika gagal, moderator diberi tahu (bukan diam). */
  async function tryAction(ctx: Ctx, fn: () => Promise<unknown>): Promise<boolean> {
    try {
      await fn();
      return true;
    } catch (e) {
      console.error("[mod] tindakan gagal:", errText(e));
      await reply(ctx, T.actionFailed);
      return false;
    }
  }

  async function guardTarget(ctx: Ctx, groupId: number, t: Target): Promise<boolean> {
    if (await deps.mods.isModerator(groupId, t.id)) {
      await reply(ctx, T.cannotTargetMod);
      return false;
    }
    return true;
  }

  bot.command(["bantuan", "modhelp"], async (ctx) => {
    if ((await modGuard(ctx)) === null) return;
    await replyMod(ctx, T.helpMod);
  });

  bot.command("warn", async (ctx) => {
    const g = await modGuard(ctx);
    if (g === null) return;
    const r = await resolveTarget(ctx, g);
    if (!r || !(await guardTarget(ctx, g, r.target))) return;
    const s = await deps.settings.get();
    const now = deps.now();
    const alasan = r.rest || "melanggar aturan grup";
    const replied = ctx.msg.reply_to_message;
    await deps.repo.addWarning({
      chatId: g,
      userId: r.target.id,
      reason: `mod:${alasan}`.slice(0, 200),
      excerpt: replied?.text ?? replied?.caption ?? null,
      by: actorId(ctx),
      now,
    });
    await deps.repo.logAction({
      chatId: g,
      action: "warn",
      target: r.target.id,
      by: actorId(ctx),
      reason: alasan,
      now,
    });
    if (replied && ctx.chat.id === g) await safeDelete(ctx.api, g, replied.message_id);
    const count = await deps.repo.countActiveWarnings(g, r.target.id, warnWindowStart(deps, s));
    await safeDelete(ctx.api, ctx.chat.id, ctx.msg.message_id);
    await applyLadder(ctx.api, deps, g, r.target, count, alasan);
  });

  bot.command("unwarn", async (ctx) => {
    const g = await modGuard(ctx);
    if (g === null) return;
    const r = await resolveTarget(ctx, g);
    if (!r) return;
    const s = await deps.settings.get();
    const now = deps.now();
    const since = warnWindowStart(deps, s);
    const ok = await deps.repo.revokeLatestWarning(g, r.target.id, since, actorId(ctx), now);
    const nama = mention(r.target);
    if (!ok) return reply(ctx, fill(T.noActiveWarning, { nama }));
    await deps.repo.logAction({
      chatId: g,
      action: "unwarn",
      target: r.target.id,
      by: actorId(ctx),
      now,
    });
    const jumlah = await deps.repo.countActiveWarnings(g, r.target.id, since);
    await reply(ctx, fill(T.unwarned, { nama, jumlah }));
  });

  bot.command("mute", async (ctx) => {
    const g = await modGuard(ctx);
    if (g === null) return;
    const r = await resolveTarget(ctx, g);
    if (!r || !(await guardTarget(ctx, g, r.target))) return;
    const s = await deps.settings.get();
    const hours = Number(r.rest.split(/\s+/)[0]) || s.muteHours;
    const jam = Math.min(Math.max(1, Math.round(hours)), 24 * 30);
    if (!(await tryAction(ctx, () => muteMember(ctx.api, deps, g, r.target.id, jam)))) return;
    await deps.repo.logAction({
      chatId: g,
      action: "mute",
      target: r.target.id,
      by: actorId(ctx),
      reason: `${jam} jam`,
      now: deps.now(),
    });
    await reply(ctx, fill(T.muted, { nama: mention(r.target), bisu: jam }));
  });

  bot.command("unmute", async (ctx) => {
    const g = await modGuard(ctx);
    if (g === null) return;
    const r = await resolveTarget(ctx, g);
    if (!r) return;
    if (!(await tryAction(ctx, () => unmuteMember(ctx.api, deps, g, r.target.id)))) return;
    await deps.repo.logAction({
      chatId: g,
      action: "unmute",
      target: r.target.id,
      by: actorId(ctx),
      now: deps.now(),
    });
    await reply(ctx, fill(T.unmuted, { nama: mention(r.target) }));
  });

  bot.command("kick", async (ctx) => {
    const g = await modGuard(ctx);
    if (g === null) return;
    const r = await resolveTarget(ctx, g);
    if (!r || !(await guardTarget(ctx, g, r.target))) return;
    if (!(await tryAction(ctx, () => kickMember(ctx.api, g, r.target.id)))) return;
    await deps.repo.logAction({
      chatId: g,
      action: "kick",
      target: r.target.id,
      by: actorId(ctx),
      reason: r.rest || null,
      now: deps.now(),
    });
    await reply(ctx, fill(T.kicked, { nama: mention(r.target) }));
  });

  bot.command("riwayat", async (ctx) => {
    const g = await modGuard(ctx);
    if (g === null) return;
    const r = await resolveTarget(ctx, g);
    if (!r) return;
    const [warns, acts] = await Promise.all([
      deps.repo.recentWarnings(g, r.target.id),
      deps.repo.recentActions(g, r.target.id),
    ]);
    const lines = [
      `<b>Riwayat</b> ${mention(r.target)} (<code>${r.target.id}</code>)`,
      "",
      "<b>Peringatan</b>",
    ];
    if (warns.length === 0) lines.push("—");
    for (const w of warns) {
      const st = w.revokedAt ? " <i>(dibatalkan)</i>" : "";
      lines.push(`• ${formatWib(w.createdAt)}: ${escapeHtml(w.reason)}${st}`);
    }
    lines.push("", "<b>Tindakan</b>");
    if (acts.length === 0) lines.push("—");
    for (const a of acts)
      lines.push(
        `• ${formatWib(a.createdAt)}: ${a.action}${a.reason ? ` (${escapeHtml(a.reason)})` : ""}`,
      );
    await replyMod(ctx, lines.join("\n"));
  });

  // ---------- daftar kata & domain ----------
  async function listCommand(ctx: Ctx, key: "bannedWords" | "domainWhitelist", label: string) {
    const g = await modGuard(ctx, { global: true });
    if (g === null) return;
    const [sub = "daftar", ...rest] = ctx.match.trim().split(/\s+/);
    const value = rest.join(" ").trim().toLowerCase();
    const s = await deps.settings.get();
    const list = [...s[key]];
    if (sub === "daftar" || sub === "") {
      return replyMod(
        ctx,
        `<b>${label}</b> (${list.length})\n${list.map((x) => `• ${escapeHtml(x)}`).join("\n") || "—"}`,
      );
    }
    if (!value)
      return reply(
        ctx,
        `Contoh: /${escapeHtml(ctx.msg.text?.split(/[\s@]/)[0]?.slice(1) ?? "")} ${escapeHtml(sub)} contoh`,
      );
    let next: string[];
    if (sub === "tambah") {
      if (list.includes(value)) return reply(ctx, "Sudah ada di daftar.");
      next = [...list, value];
    } else if (sub === "hapus") {
      if (!list.includes(value)) return reply(ctx, "Tidak ada di daftar.");
      next = list.filter((x) => x !== value);
    } else {
      return reply(ctx, "Pilihan: daftar, tambah, hapus.");
    }
    try {
      await deps.settings.set(key, next, actorId(ctx));
    } catch {
      return reply(ctx, "Nilai tidak valid (terlalu pendek/panjang).");
    }
    await deps.repo.logAction({
      chatId: g,
      action: `setting:${key}:${sub}`,
      by: actorId(ctx),
      reason: value,
      now: deps.now(),
    });
    await reply(ctx, T.settingSaved);
  }
  bot.command("kata", (ctx) => listCommand(ctx, "bannedWords", "Kata terlarang"));
  bot.command("domain", (ctx) => listCommand(ctx, "domainWhitelist", "Domain yang diizinkan"));

  // ---------- teks & angka ----------
  bot.command("setteks", async (ctx) => {
    const g = await modGuard(ctx, { global: true });
    if (g === null) return;
    const m = /^(\S+)\s+([\s\S]+)$/.exec(ctx.match.trim());
    const key = m ? TEXT_SETTINGS[m[1]!.toLowerCase()] : undefined;
    if (!m || !key) {
      return reply(
        ctx,
        `Format: /setteks ${Object.keys(TEXT_SETTINGS).join("|")} &lt;teks&gt;\nPlaceholder sapaan: {nama} {menit} {tryout_url}`,
      );
    }
    const text = m[2]!.trim();
    // Uji dulu apakah HTML-nya diterima Telegram, supaya sapaan tidak rusak.
    try {
      const probe = await ctx.api.sendMessage(
        ctx.chat.id,
        fill(text, { nama: "Contoh", menit: 5, tryout_url: "https://abdinegara.site" }),
        {
          parse_mode: "HTML",
          link_preview_options: { is_disabled: true },
        },
      );
      await deps.repo.scheduleDelete(ctx.chat.id, probe.message_id, secondsFromNow(deps.now(), 60));
    } catch {
      return reply(ctx, T.htmlRejected);
    }
    await deps.settings.set(key, text, actorId(ctx));
    await deps.repo.logAction({
      chatId: g,
      action: `setting:${key}`,
      by: actorId(ctx),
      now: deps.now(),
    });
    await reply(ctx, `${T.settingSaved} (pratinjau di atas)`);
  });

  bot.command("atur", async (ctx) => {
    const g = await modGuard(ctx, { global: true });
    if (g === null) return;
    const s = await deps.settings.get();
    const [name, val] = ctx.match.trim().split(/\s+/);
    const def = name ? NUMERIC_SETTINGS[name.toLowerCase()] : undefined;
    if (!name || !def || val === undefined) {
      const lines = Object.entries(NUMERIC_SETTINGS).map(
        ([n, d]) => `• <code>${n}</code> = ${String(s[d.key])} · ${d.desc}`,
      );
      return replyMod(
        ctx,
        `<b>Pengaturan angka</b>\n${lines.join("\n")}\n\nUbah: /atur nama nilai`,
      );
    }
    const num = Number(val);
    try {
      await deps.settings.set(def.key, num as Settings[typeof def.key], actorId(ctx));
    } catch {
      return reply(ctx, "Nilai di luar batas yang diizinkan.");
    }
    await deps.repo.logAction({
      chatId: g,
      action: `setting:${def.key}`,
      by: actorId(ctx),
      reason: val,
      now: deps.now(),
    });
    await reply(ctx, T.settingSaved);
  });

  // ---------- posting terjadwal ----------
  bot.command("terjadwal", async (ctx) => {
    const g = await modGuard(ctx);
    if (g === null) return;
    const raw = ctx.match.trim();
    const [sub = "daftar"] = raw.split(/\s+/);
    if (sub === "daftar" || raw === "") {
      const posts = await deps.repo.listScheduledPosts(g);
      const lines = posts.map(
        (p) =>
          `• <b>#${p.id}</b> ${describeCron(p.cron)} (berikutnya ${formatWib(p.nextRunAt)})\n  ${escapeHtml(p.text.replace(/<[^>]+>/g, "").slice(0, 80))}…`,
      );
      return replyMod(ctx, `<b>Posting terjadwal</b>\n${lines.join("\n") || "—"}`);
    }
    if (sub === "hapus") {
      const id = Number(raw.split(/\s+/)[1]);
      const ok = Number.isSafeInteger(id) && (await deps.repo.deactivateScheduledPost(g, id));
      return reply(
        ctx,
        ok ? `Posting #${id} dihentikan.` : "ID tidak ditemukan. Cek /terjadwal daftar.",
      );
    }
    if (sub === "tambah") {
      const m = /^tambah\s+(\S+)\s+(\S+)\s+([\s\S]+)$/.exec(raw);
      const cron = m ? friendlyToCron(m[1]!, m[2]!) : null;
      if (!m || !cron) {
        return reply(
          ctx,
          "Format: /terjadwal tambah 19:00 harian &lt;teks&gt;\natau: /terjadwal tambah 07:30 senin,kamis &lt;teks&gt;",
        );
      }
      const text = m[3]!.trim();
      try {
        const probe = await ctx.api.sendMessage(ctx.chat.id, text, {
          parse_mode: "HTML",
          link_preview_options: { is_disabled: true },
        });
        await deps.repo.scheduleDelete(
          ctx.chat.id,
          probe.message_id,
          secondsFromNow(deps.now(), 60),
        );
      } catch {
        return reply(ctx, T.htmlRejected);
      }
      const id = await deps.repo.addScheduledPost({
        chatId: g,
        text,
        cron,
        nextRunAt: nextRun(cron, deps.now()),
        by: actorId(ctx),
      });
      await deps.repo.logAction({
        chatId: g,
        action: "schedule_add",
        by: actorId(ctx),
        reason: `#${id} ${cron}`,
        now: deps.now(),
      });
      return reply(ctx, `Posting #${id} dijadwalkan: ${describeCron(cron)}.`);
    }
    return reply(ctx, "Pilihan: daftar, tambah, hapus.");
  });

  // ---------- tombol di notifikasi moderator ----------
  bot.callbackQuery(/^(mk|mu):(-?\d+):(\d+)$/, async (ctx) => {
    const [, act, chatStr, userStr] = ctx.match;
    const chatId = Number(chatStr);
    const userId = Number(userStr);
    if (
      !deps.env.ALLOWED_CHAT_IDS.includes(chatId) ||
      !(await deps.mods.isModerator(chatId, ctx.from.id))
    ) {
      await ctx.answerCallbackQuery({ text: T.notModerator, show_alert: true });
      return;
    }
    const m = await deps.repo.getMember(chatId, userId);
    const nama = mention({ id: userId, first_name: m?.firstName ?? String(userId) });
    if (act === "mk" && (await deps.mods.isModerator(chatId, userId))) {
      await ctx.answerCallbackQuery({ text: T.cannotTargetMod, show_alert: true });
      return;
    }
    try {
      if (act === "mk") await kickMember(ctx.api, chatId, userId);
      else await unmuteMember(ctx.api, deps, chatId, userId);
    } catch (e) {
      console.error("[modbtn]", errText(e));
      await ctx.answerCallbackQuery({ text: T.actionFailed, show_alert: true });
      await notifyModerators(
        ctx.api,
        deps,
        chatId,
        `Tindakan untuk ${nama} gagal: ${escapeHtml(errText(e).slice(0, 200))}`,
      );
      return;
    }
    await deps.repo.logAction({
      chatId,
      action: act === "mk" ? "kick" : "unmute",
      target: userId,
      by: ctx.from.id,
      now: deps.now(),
    });
    await ctx.answerCallbackQuery({ text: "Beres." });
    const done = act === "mk" ? "Dikeluarkan" : "Bisu dibuka";
    try {
      await ctx.editMessageText(
        `${escapeHtml(ctx.callbackQuery.message?.text ?? "")}\n\n✔ ${done} oleh ${mention(ctx.from)}`,
        { parse_mode: "HTML" },
      );
    } catch {
      // pesan notifikasi terlalu lama / sudah diubah: abaikan
    }
  });
}
