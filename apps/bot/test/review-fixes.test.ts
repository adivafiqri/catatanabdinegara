// Tes regresi untuk temuan code review & security review Milestone 1.
import { describe, expect, it } from "vitest";
import { botPendingVerifications, botScheduledPosts, botWarnings } from "@can/db";
import { errText, redact } from "../src/lib/log.js";
import { detectViolation } from "../src/moderation/detect.js";
import { DEFAULT_SETTINGS } from "../src/settings.js";
import { tick } from "../src/scheduler.js";
import { ADMIN, ALICE, BOB, GROUP, GROUP2, setup } from "./helpers.js";

const MIN = 60_000;
const permsOf = (c: { payload: Record<string, unknown> }) =>
  c.payload.permissions as Record<string, boolean>;

describe("verifikasi tahan kegagalan", () => {
  it("gagal membuka izin → pending tetap ada, tombol bisa ditekan lagi", async () => {
    const t = await setup();
    await t.join(ALICE);
    t.fail.set("restrictChatMember", 1);
    t.reset();
    await t.click(ALICE, `v:${ALICE.id}`);
    expect(t.called("answerCallbackQuery")[0]!.payload.show_alert).toBe(true);
    expect(await t.db.select().from(botPendingVerifications)).toHaveLength(1);
    t.reset();
    await t.click(ALICE, `v:${ALICE.id}`);
    expect(permsOf(t.called("restrictChatMember")[0]!).can_send_messages).toBe(true);
    expect(await t.db.select().from(botPendingVerifications)).toHaveLength(0);
  });

  it("gagal mengeluarkan saat waktu habis → dicoba lagi pada putaran berikutnya", async () => {
    const t = await setup();
    await t.join(ALICE);
    t.advance(6 * MIN);
    t.fail.set("banChatMember", 1);
    await tick(t.bot.api, t.deps);
    expect(await t.db.select().from(botPendingVerifications)).toHaveLength(1);
    t.reset();
    t.advance(3 * MIN);
    await tick(t.bot.api, t.deps);
    expect(t.called("banChatMember")).toHaveLength(1);
    expect(t.called("unbanChatMember")).toHaveLength(1);
    expect(await t.db.select().from(botPendingVerifications)).toHaveLength(0);
  });

  it("unban dicoba ulang agar tidak menjadi ban permanen", async () => {
    const t = await setup();
    await t.join(ALICE);
    t.advance(6 * MIN);
    t.fail.set("unbanChatMember", 1);
    await tick(t.bot.api, t.deps);
    expect(t.called("unbanChatMember")).toHaveLength(2);
    expect(await t.db.select().from(botPendingVerifications)).toHaveLength(0);
  });

  it("anggota yang dibisukan tidak lolos dengan keluar-masuk grup", async () => {
    const t = await setup();
    for (let i = 0; i < 3; i++) {
      await t.message(ALICE, `https://bimbelx.com/${i}`);
      t.advance(MIN);
    }
    await t.join(ALICE);
    t.reset();
    await t.click(ALICE, `v:${ALICE.id}`);
    const r = t.called("restrictChatMember")[0]!;
    expect(permsOf(r).can_send_messages).toBe(false);
    expect(r.payload.until_date).toBeTypeOf("number");
  });

  it("masuk lagi sebelum verifikasi: sapaan lama dihapus", async () => {
    const t = await setup();
    await t.join(ALICE);
    t.reset();
    await t.join(ALICE);
    expect(t.called("deleteMessage").map((c) => c.payload.message_id)).toContain(5001);
  });
});

describe("anti-spam", () => {
  it("album foto dihitung sekali (bukan flood)", async () => {
    const t = await setup();
    for (let i = 0; i < 8; i++) {
      await t.message(ALICE, "", {
        text: undefined,
        media_group_id: "album1",
        photo: [{ file_id: `f${i}`, file_unique_id: `u${i}`, width: 1, height: 1 }],
      });
    }
    expect(t.called("deleteMessage")).toHaveLength(0);
    expect(await t.db.select().from(botWarnings)).toHaveLength(0);
  });

  it("%-encoding rusak tidak meloloskan link (juga text_link tersembunyi)", () => {
    const rules = { bannedWords: [], domainWhitelist: ["catatanabdinegara.site"] };
    const base = { hasMedia: false, isForwarded: false, isNewbie: false };
    expect(detectViolation({ ...base, text: "https://evil.com/%" }, rules).kind).toBe("violation");
    expect(
      detectViolation(
        {
          ...base,
          isNewbie: true,
          text: "klik sini",
          entities: [{ type: "text_link", offset: 0, length: 4, url: "https://scam.example/x%" }],
        },
        rules,
      ),
    ).toMatchObject({ reason: "link" });
  });

  it("kata bawaan tidak menghukum anggota yang saling memperingatkan", () => {
    const rules = { bannedWords: DEFAULT_SETTINGS.bannedWords, domainWhitelist: [] };
    const base = { hasMedia: false, isForwarded: false, isNewbie: false };
    for (const text of [
      "Hati-hati ada yang nawarin joki",
      "awas pinjol",
      "Ini bukan bocoran soal ya",
      "jangan percaya yang bilang dijamin lulus",
      "jawabannya a. 7 b. 0 c. 9",
    ]) {
      expect(detectViolation({ ...base, text }, rules).kind, text).toBe("ok");
    }
    expect(detectViolation({ ...base, text: "OPEN JOKI tryout murah" }, rules).kind).toBe(
      "violation",
    );
  });

  it("admin tetap dikecualikan walau daftar admin gagal diambil ulang", async () => {
    const t = await setup();
    await t.message(ADMIN, "https://bimbelx.com"); // isi cache
    t.advance(6 * MIN);
    t.fail.set("getChatAdministrators", 5);
    t.reset();
    await t.message(ADMIN, "https://bimbelx.com/2");
    expect(t.called("deleteMessage")).toHaveLength(0);
  });

  it("balasan admin atas nama channel tertaut tidak dihapus", async () => {
    const t = await setup();
    t.bot.api.config.use(async (prev, method, payload, signal) => {
      if (method === "getChat")
        return {
          ok: true,
          result: { id: GROUP, type: "supergroup", linked_chat_id: -100777, permissions: {} },
        } as never;
      return prev(method, payload, signal);
    });
    await t.message(ALICE, "info", { sender_chat: { id: -100777, type: "channel", title: "CAN" } });
    expect(t.called("deleteMessage")).toHaveLength(0);
  });
});

describe("perintah moderator", () => {
  it("admin grup kedua tidak bisa mengubah pengaturan global", async () => {
    const t = await setup({ twoGroups: true });
    await t.command(BOB, "/domain tambah evil.com", {}, GROUP2);
    expect((await t.deps.settings.get()).domainWhitelist).not.toContain("evil.com");
    await t.command(ADMIN, "/domain tambah ok.com");
    expect((await t.deps.settings.get()).domainWhitelist).toContain("ok.com");
  });

  it("posting terjadwal dengan HTML rusak ditolak saat dibuat", async () => {
    const t = await setup();
    t.fail.set("sendMessage", 1);
    await t.command(ADMIN, "/terjadwal tambah 19:00 harian Semangat TO besok <3");
    expect(await t.db.select().from(botScheduledPosts)).toHaveLength(0);
    expect(t.sentTexts().at(-1)).toContain("ditolak");
  });

  it("tindakan yang gagal di Telegram dilaporkan ke moderator", async () => {
    const t = await setup();
    t.fail.set("banChatMember", 1);
    await t.command(ADMIN, "/kick", {
      reply_to_message: {
        message_id: 1,
        date: 0,
        chat: { id: GROUP, type: "supergroup" },
        from: ALICE,
        text: "x",
      },
    });
    expect(t.sentTexts().at(-1)).toContain("Gagal");
  });

  it("alasan dengan & tidak di-escape dua kali", async () => {
    const t = await setup();
    const reply = {
      reply_to_message: {
        message_id: 1,
        date: 0,
        chat: { id: GROUP, type: "supergroup" },
        from: ALICE,
        text: "x",
      },
    };
    await t.command(ADMIN, "/warn spam & promosi", reply);
    expect(t.sentTexts().at(-1)).toContain("spam &amp; promosi");
    expect(t.sentTexts().at(-1)).not.toContain("&amp;amp;");
  });
});

describe("log aman", () => {
  it("token bot disensor dari pesan error (termasuk cause)", () => {
    // Dirangkai saat tes agar pemindai secret (gitleaks) tidak menganggapnya token sungguhan.
    const token = ["123456789", "AAH4fake" + "FAKE".repeat(6) + "_-x"].join(":");
    const inner = new Error(`request to https://api.telegram.org/bot${token}/sendMessage failed`);
    const outer = new Error("Network request for 'sendMessage' failed!", { cause: inner });
    const out = errText(outer);
    expect(out).not.toContain(token);
    expect(out).toContain("bot<TOKEN>");
    expect(redact(`token=${token}`)).not.toContain(token);
  });
});
