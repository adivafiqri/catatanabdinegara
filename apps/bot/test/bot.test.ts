import { describe, expect, it } from "vitest";
import { botPendingVerifications, botScheduledPosts, botWarnings } from "@can/db";
import { seedDefaultPosts, tick } from "../src/scheduler.js";
import { ADMIN, ALICE, BOB, GROUP, MODCHAT, setup } from "./helpers.js";

const MIN = 60_000;

describe("anggota baru & verifikasi", () => {
  it("membatasi, menyapa dengan tombol, lalu membuka setelah tombol ditekan", async () => {
    const t = await setup();
    await t.join(ALICE);
    const restrict = t.called("restrictChatMember")[0]!;
    expect(restrict.payload.user_id).toBe(ALICE.id);
    expect((restrict.payload.permissions as Record<string, boolean>).can_send_messages).toBe(false);
    const welcome = t.called("sendMessage")[0]!;
    expect(String(welcome.payload.text)).toContain("Alice");
    expect(String(welcome.payload.text)).toContain("https://abdinegara.site");
    expect(JSON.stringify(welcome.payload.reply_markup)).toContain(`v:${ALICE.id}`);
    expect(await t.db.select().from(botPendingVerifications)).toHaveLength(1);

    t.reset();
    await t.click(BOB, `v:${ALICE.id}`);
    expect(t.called("answerCallbackQuery")[0]!.payload.show_alert).toBe(true);
    expect(t.called("restrictChatMember")).toHaveLength(0);

    t.reset();
    await t.click(ALICE, `v:${ALICE.id}`);
    expect(
      (t.called("restrictChatMember")[0]!.payload.permissions as Record<string, boolean>)
        .can_send_messages,
    ).toBe(true);
    expect(t.called("deleteMessage").map((c) => c.payload.message_id)).toContain(5001);
    expect(t.sentTexts().some((x) => x.includes("Selamat bergabung"))).toBe(true);
    expect(await t.db.select().from(botPendingVerifications)).toHaveLength(0);
  });

  it("menekan tombol dua kali tidak membuka ulang", async () => {
    const t = await setup();
    await t.join(ALICE);
    await t.click(ALICE, `v:${ALICE.id}`);
    t.reset();
    await t.click(ALICE, `v:${ALICE.id}`);
    expect(t.called("restrictChatMember")).toHaveLength(0);
  });

  it("hanya menyisakan satu sapaan: sapaan sebelumnya dihapus", async () => {
    const t = await setup();
    await t.join(ALICE);
    await t.click(ALICE, `v:${ALICE.id}`, GROUP, 5001);
    const firstWelcome = 5002;
    await t.join(BOB);
    t.reset();
    await t.click(BOB, `v:${BOB.id}`, GROUP, 5003);
    expect(t.called("deleteMessage").map((c) => c.payload.message_id)).toContain(firstWelcome);
  });

  it("tidak verifikasi dalam batas waktu → dikeluarkan (bisa gabung lagi) dan sapaan dihapus", async () => {
    const t = await setup();
    await t.join(ALICE);
    t.advance(4 * MIN);
    t.reset();
    await tick(t.bot.api, t.deps);
    expect(t.called("banChatMember")).toHaveLength(0);
    t.advance(2 * MIN);
    await tick(t.bot.api, t.deps);
    expect(t.called("banChatMember")[0]!.payload.user_id).toBe(ALICE.id);
    expect(t.called("unbanChatMember")[0]!.payload.only_if_banned).toBe(true);
    expect(t.called("deleteMessage").map((c) => c.payload.message_id)).toContain(5001);
    t.reset();
    await tick(t.bot.api, t.deps);
    expect(t.called("banChatMember")).toHaveLength(0);
  });

  it("menghapus pesan sistem 'bergabung'", async () => {
    const t = await setup();
    await t.message(ALICE, "", { text: undefined, new_chat_members: [ALICE] });
    expect(t.called("deleteMessage")).toHaveLength(1);
  });
});

describe("anti-spam & tangga peringatan", () => {
  it("link luar: peringatan 1 → 2 → bisu 24 jam + notifikasi moderator", async () => {
    const t = await setup({ modChat: true });
    for (let i = 0; i < 3; i++) {
      await t.message(ALICE, `promo https://bimbelx.com/${i}`);
      t.advance(MIN);
    }
    expect(t.called("deleteMessage")).toHaveLength(3);
    const texts = t.sentTexts();
    expect(texts[0]).toContain("peringatan 1/2");
    expect(texts[1]).toContain("peringatan 2/2");
    expect(texts.some((x) => x.includes("dibisukan 24 jam"))).toBe(true);
    const mute = t.called("restrictChatMember")[0]!;
    expect((mute.payload.permissions as Record<string, boolean>).can_send_messages).toBe(false);
    expect(mute.payload.until_date).toBeTypeOf("number");
    const modMsg = t.called("sendMessage").find((c) => c.payload.chat_id === MODCHAT)!;
    expect(JSON.stringify(modMsg.payload.reply_markup)).toContain(`mk:${GROUP}:${ALICE.id}`);
    expect(await t.db.select().from(botWarnings)).toHaveLength(3);
  });

  it("pesan biasa & link whitelist dari anggota lama tidak diganggu", async () => {
    const t = await setup();
    await t.message(ALICE, "Kak, deret 2 5 10 17 itu polanya apa?");
    await t.message(ALICE, "daftarnya di https://sscasn.bkn.go.id ya");
    expect(t.called("deleteMessage")).toHaveLength(0);
  });

  it("admin dikecualikan", async () => {
    const t = await setup();
    await t.message(ADMIN, "cek https://bimbelx.com");
    expect(t.called("deleteMessage")).toHaveLength(0);
  });

  it("anggota baru: link whitelist & media dihapus tanpa peringatan", async () => {
    const t = await setup();
    await t.join(ALICE);
    await t.click(ALICE, `v:${ALICE.id}`);
    t.reset();
    await t.message(ALICE, "https://abdinegara.site");
    await t.message(ALICE, "", {
      text: undefined,
      photo: [{ file_id: "x", file_unique_id: "y", width: 1, height: 1 }],
    });
    expect(t.called("deleteMessage")).toHaveLength(2);
    expect(await t.db.select().from(botWarnings)).toHaveLength(0);
    t.advance(25 * 60 * MIN);
    t.reset();
    await t.message(ALICE, "https://abdinegara.site");
    expect(t.called("deleteMessage")).toHaveLength(0);
  });

  it("flood: hanya satu peringatan per ledakan pesan", async () => {
    const t = await setup();
    for (let i = 0; i < 8; i++) {
      await t.message(ALICE, `halo ${i}`);
      t.advance(500);
    }
    expect(await t.db.select().from(botWarnings)).toHaveLength(1);
    expect(t.called("deleteMessage")).toHaveLength(3);
  });

  it("pesan diedit untuk menyisipkan link juga terdeteksi", async () => {
    const t = await setup();
    await t.send({
      edited_message: {
        message_id: 77,
        date: 0,
        edit_date: 1,
        chat: { id: GROUP, type: "supergroup", title: "Grup" },
        from: ALICE,
        text: "gabung t.me/+abcdef",
      },
    } as never);
    expect(t.called("deleteMessage")[0]!.payload.message_id).toBe(77);
  });

  it("pesan atas nama channel lain dihapus, posting otomatis channel tertaut dibiarkan", async () => {
    const t = await setup();
    await t.message(ALICE, "promo", {
      sender_chat: { id: -100555, type: "channel", title: "Spam" },
    });
    expect(t.called("deleteMessage")).toHaveLength(1);
    t.reset();
    await t.message(ALICE, "video baru https://tiktok.com/x", {
      sender_chat: { id: -100777, type: "channel", title: "Channel resmi" },
      is_automatic_forward: true,
    });
    expect(t.called("deleteMessage")).toHaveLength(0);
  });

  it("nama pengguna di-escape di pesan HTML", async () => {
    const t = await setup();
    await t.message(BOB, "https://bimbelx.com");
    expect(t.sentTexts()[0]).toContain("Bob &lt;b&gt;");
  });

  it("pemberitahuan bot terhapus otomatis setelah TTL", async () => {
    const t = await setup();
    await t.message(ALICE, "https://bimbelx.com");
    const notice = t.called("sendMessage")[0]!;
    t.reset();
    t.advance(61_000);
    await tick(t.bot.api, t.deps);
    expect(t.called("deleteMessage").map((c) => c.payload.message_id)).toContain(5001);
    expect(notice).toBeDefined();
  });
});

describe("perintah", () => {
  it("/aturan dibalas dan dijadwalkan terhapus", async () => {
    const t = await setup();
    await t.command(ALICE, "/aturan");
    expect(t.sentTexts()[0]).toContain("Aturan grup");
    t.reset();
    t.advance(301_000);
    await tick(t.bot.api, t.deps);
    expect(t.called("deleteMessage")).toHaveLength(2);
  });

  it("/warn oleh bukan moderator diabaikan dan perintahnya dihapus", async () => {
    const t = await setup();
    await t.command(BOB, "/warn", {
      reply_to_message: {
        message_id: 1,
        date: 0,
        chat: { id: GROUP, type: "supergroup" },
        from: ALICE,
        text: "x",
      },
    });
    expect(await t.db.select().from(botWarnings)).toHaveLength(0);
    expect(t.called("deleteMessage")).toHaveLength(1);
  });

  it("/warn & /unwarn oleh admin dengan membalas pesan", async () => {
    const t = await setup();
    const reply = {
      reply_to_message: {
        message_id: 1,
        date: 0,
        chat: { id: GROUP, type: "supergroup" },
        from: ALICE,
        text: "spam",
      },
    };
    await t.command(ADMIN, "/warn jualan", reply);
    expect(await t.db.select().from(botWarnings)).toHaveLength(1);
    expect(t.sentTexts().some((x) => x.includes("peringatan 1/2"))).toBe(true);
    t.reset();
    await t.command(ADMIN, "/unwarn", reply);
    expect(t.sentTexts()[0]).toContain("Sisa peringatan aktif: 0");
  });

  it("moderator tidak bisa menindak admin", async () => {
    const t = await setup();
    t.deps.env.MODERATOR_IDS.push(ALICE.id);
    await t.command(ALICE, "/mute", {
      reply_to_message: {
        message_id: 1,
        date: 0,
        chat: { id: GROUP, type: "supergroup" },
        from: ADMIN,
        text: "x",
      },
    });
    expect(t.called("restrictChatMember")).toHaveLength(0);
    expect(t.sentTexts()[0]).toContain("sesama moderator");
  });

  it("/kata tambah langsung berlaku", async () => {
    const t = await setup();
    await t.command(ADMIN, "/kata tambah mabar");
    t.reset();
    await t.message(ALICE, "ayo MABAR malam ini");
    expect(t.called("deleteMessage")).toHaveLength(1);
  });

  it("/domain tambah mengizinkan domain baru", async () => {
    const t = await setup();
    await t.command(ADMIN, "/domain tambah kemdikbud.go.id");
    t.reset();
    await t.message(ALICE, "baca https://kemdikbud.go.id/info");
    expect(t.called("deleteMessage")).toHaveLength(0);
  });

  it("/riwayat dari grup moderator dikirim ke grup moderator, sasaran via @username", async () => {
    const t = await setup({ modChat: true });
    await t.message(ALICE, "https://bimbelx.com");
    t.reset();
    await t.command(ADMIN, "/riwayat @alice", {}, MODCHAT);
    const out = t.called("sendMessage")[0]!;
    expect(out.payload.chat_id).toBe(MODCHAT);
    expect(String(out.payload.text)).toContain("link");
  });

  it("/atur mengubah angka dalam batas", async () => {
    const t = await setup();
    await t.command(ADMIN, "/atur verifikasi_menit 10");
    expect((await t.deps.settings.get()).verifyTimeoutMin).toBe(10);
    await t.command(ADMIN, "/atur verifikasi_menit 999");
    expect((await t.deps.settings.get()).verifyTimeoutMin).toBe(10);
  });

  it("tombol 'Buka bisu' hanya untuk moderator", async () => {
    const t = await setup({ modChat: true });
    await t.click(BOB, `mu:${GROUP}:${ALICE.id}`, MODCHAT);
    expect(t.called("restrictChatMember")).toHaveLength(0);
    await t.click(ADMIN, `mu:${GROUP}:${ALICE.id}`, MODCHAT);
    expect(t.called("restrictChatMember")).toHaveLength(1);
  });
});

describe("posting terjadwal", () => {
  it("dijadwalkan dalam WIB dan tidak terkirim dua kali", async () => {
    const t = await setup();
    // jam sekarang 10:00 UTC = 17:00 WIB
    await t.command(ADMIN, "/terjadwal tambah 19:00 harian Jangan lupa latihan TIU malam ini!");
    const [post] = await t.db.select().from(botScheduledPosts);
    expect(post!.nextRunAt.toISOString()).toBe("2026-12-01T12:00:00.000Z");
    t.reset();
    t.advance(2 * 60 * MIN + 10_000);
    await tick(t.bot.api, t.deps);
    await tick(t.bot.api, t.deps);
    expect(t.sentTexts().filter((x) => x.includes("latihan TIU"))).toHaveLength(1);
    const [after] = await t.db.select().from(botScheduledPosts);
    expect(after!.nextRunAt.toISOString()).toBe("2026-12-02T12:00:00.000Z");
  });

  it("format salah ditolak", async () => {
    const t = await setup();
    await t.command(ADMIN, "/terjadwal tambah 25:00 harian teks");
    await t.command(ADMIN, "/terjadwal tambah 19:00 senen teks");
    expect(await t.db.select().from(botScheduledPosts)).toHaveLength(0);
  });

  it("seed posting anti-penipuan sekali saja", async () => {
    const t = await setup();
    await seedDefaultPosts(t.deps);
    await seedDefaultPosts(t.deps);
    const posts = await t.db.select().from(botScheduledPosts);
    expect(posts).toHaveLength(1);
    expect(posts[0]!.text).toContain("tidak pernah");
  });
});

describe("keamanan", () => {
  it("keluar dari grup yang tidak diizinkan", async () => {
    const t = await setup();
    await t.send({
      message: {
        message_id: 1,
        date: 0,
        chat: { id: -100111, type: "supergroup", title: "Asing" },
        from: ALICE,
        text: "halo",
      },
    } as never);
    expect(t.called("leaveChat")).toHaveLength(1);
  });
});

describe("mode persiapan & /id", () => {
  it("tanpa ALLOWED_CHAT_IDS bot hanya menjawab /id dan tidak keluar grup", async () => {
    const t = await setup();
    t.deps.env.ALLOWED_CHAT_IDS.length = 0;
    const { createBot } = await import("../src/bot.js");
    const bot = createBot("123:abc", t.deps, { botInfo: t.bot.botInfo });
    const calls: string[] = [];
    bot.api.config.use(async (_p, method, payload) => {
      calls.push(`${method}:${JSON.stringify(payload)}`);
      return {
        ok: true,
        result: { message_id: 1, date: 0, chat: { id: -100111, type: "supergroup" } },
      } as never;
    });
    const msg = (text: string) =>
      bot.handleUpdate({
        update_id: 1,
        message: {
          message_id: 1,
          date: 0,
          chat: { id: -100111, type: "supergroup", title: "Baru" },
          from: ALICE,
          text,
          ...(text.startsWith("/")
            ? { entities: [{ type: "bot_command", offset: 0, length: text.length }] }
            : {}),
        },
      } as never);
    await msg("https://spam.com");
    await msg("/id");
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("-100111");
  });
});
