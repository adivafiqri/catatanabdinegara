import { describe, expect, it } from "vitest";
import { detectViolation, ladderStep } from "../src/moderation/detect.js";
import { FloodGuard } from "../src/moderation/flood.js";
import { extractLinks, isInviteLink, isWhitelisted, parseLink } from "../src/moderation/links.js";
import { findBannedTerm, normalizeText } from "../src/moderation/normalize.js";

const rules = {
  bannedWords: ["judi", "slot gacor", "judol*", "jual akun", "pinjol"],
  domainWhitelist: ["abdinegara.site", "sscasn.bkn.go.id", "tiktok.com/@catatan.abdinegara"],
};
const base = { hasMedia: false, isForwarded: false, isNewbie: false };

describe("normalizeText & kata terlarang", () => {
  it("menangkap samaran angka, spasi, dan huruf berulang", () => {
    expect(findBannedTerm("ayo main JUD1 di sini", rules.bannedWords)).toBe("judi");
    expect(findBannedTerm("j u d i online", rules.bannedWords)).toBe("judi");
    expect(findBannedTerm("j.u.d.i", rules.bannedWords)).toBe("judi");
    expect(findBannedTerm("SLOOOT GAC0R maxwin", rules.bannedWords)).toBe("slot gacor");
    expect(findBannedTerm("jüdi", rules.bannedWords)).toBe("judi");
  });
  it("mendukung awalan dengan *", () => {
    expect(findBannedTerm("info judolnya bang", rules.bannedWords)).toBe("judol*");
  });
  it("tidak salah tangkap kata yang mirip", () => {
    expect(findBannedTerm("Budi sedang belajar TIU", rules.bannedWords)).toBeNull();
    expect(findBannedTerm("judikasi", rules.bannedWords)).toBeNull();
    expect(findBannedTerm("pembahasan TWK nomor 15", rules.bannedWords)).toBeNull();
    expect(findBannedTerm("aku jual buku bekas, bukan akun", rules.bannedWords)).toBeNull();
  });
  it("normalisasi menghasilkan token berspasi", () => {
    expect(normalizeText("Halo, Kak!!")).toBe(" halo kak ");
  });
});

describe("tautan", () => {
  it("mengurai entity url dan text_link", () => {
    const text = "cek abdinegara.site dan ini";
    const links = extractLinks(text, [
      { type: "url", offset: 4, length: 15 },
      { type: "text_link", offset: 24, length: 3, url: "https://evil.example.com/x" },
    ]);
    expect(links.map((l) => l.host)).toEqual(["abdinegara.site", "evil.example.com"]);
  });
  it("whitelist domain, subdomain, dan awalan path", () => {
    const wl = rules.domainWhitelist;
    expect(isWhitelisted(parseLink("https://www.abdinegara.site/tryout")!, wl)).toBe(true);
    expect(isWhitelisted(parseLink("sscasn.bkn.go.id")!, wl)).toBe(true);
    expect(isWhitelisted(parseLink("bkn.go.id")!, wl)).toBe(false);
    expect(isWhitelisted(parseLink("abdinegara.site.evil.com")!, wl)).toBe(false);
    expect(isWhitelisted(parseLink("https://tiktok.com/@catatan.abdinegara/video/1")!, wl)).toBe(
      true,
    );
    expect(isWhitelisted(parseLink("https://tiktok.com/@akunlain")!, wl)).toBe(false);
    expect(isWhitelisted(parseLink("https://tiktok.com/@catatan.abdinegara2")!, wl)).toBe(false);
  });
  it("mengenali undangan grup", () => {
    expect(isInviteLink(parseLink("https://t.me/+AbCdEf")!)).toBe(true);
    expect(isInviteLink(parseLink("t.me/joinchat/xyz")!)).toBe(true);
    expect(isInviteLink(parseLink("https://t.me/somechannel")!)).toBe(false);
  });
});

describe("detectViolation", () => {
  it("pesan biasa lolos", () => {
    expect(detectViolation({ ...base, text: "Kak, TIU deret angka itu gimana?" }, rules)).toEqual({
      kind: "ok",
    });
  });
  it("tautan whitelist lolos untuk anggota lama", () => {
    expect(
      detectViolation({ ...base, text: "daftar di https://sscasn.bkn.go.id ya" }, rules).kind,
    ).toBe("ok");
  });
  it("undangan grup diprioritaskan", () => {
    const v = detectViolation({ ...base, text: "gabung t.me/+Xyz123" }, rules);
    expect(v).toMatchObject({ reason: "invite", warn: true });
  });
  it("undangan yang disamarkan", () => {
    const v = detectViolation({ ...base, text: "gabung t . me/+Xyz123 sekarang" }, rules);
    expect(v).toMatchObject({ reason: "invite" });
  });
  it("tautan luar", () => {
    expect(detectViolation({ ...base, text: "promo https://bimbelx.com" }, rules)).toMatchObject({
      reason: "link",
      detail: "bimbelx.com",
    });
    expect(detectViolation({ ...base, text: "chat wa . me/62812" }, rules)).toMatchObject({
      reason: "link",
    });
  });
  it("kata terlarang", () => {
    expect(detectViolation({ ...base, text: "jual akun premium murah" }, rules)).toMatchObject({
      reason: "banned_word",
      warn: true,
    });
  });
  it("anggota baru tidak boleh kirim link (meski whitelist) atau media, tanpa peringatan", () => {
    expect(
      detectViolation({ ...base, isNewbie: true, text: "https://abdinegara.site" }, rules),
    ).toMatchObject({
      reason: "newbie_link",
      warn: false,
    });
    expect(
      detectViolation({ ...base, isNewbie: true, hasMedia: true, text: "" }, rules),
    ).toMatchObject({
      reason: "newbie_media",
      warn: false,
    });
    expect(
      detectViolation({ ...base, isNewbie: true, isForwarded: true, text: "lihat" }, rules),
    ).toMatchObject({
      reason: "newbie_media",
    });
  });
});

describe("ladderStep", () => {
  it("1 -> warn1, 2 -> warn2, 3+ -> mute", () => {
    expect(ladderStep(1)).toBe("warn1");
    expect(ladderStep(2)).toBe("warn2");
    expect(ladderStep(3)).toBe("mute");
    expect(ladderStep(7)).toBe("mute");
  });
});

describe("FloodGuard", () => {
  const fr = { maxMessages: 5, windowSeconds: 10, duplicateMax: 3, duplicateWindowSeconds: 60 };
  it("memicu flood sekali lalu flood_repeat", () => {
    let t = 0;
    const g = new FloodGuard(() => t);
    const res = [1, 2, 3, 4, 5, 6, 7].map((i) => {
      t += 500;
      return g.check(1, 9, `pesan ${i}`, fr);
    });
    expect(res.slice(0, 5)).toEqual(["ok", "ok", "ok", "ok", "ok"]);
    expect(res[5]).toBe("flood");
    expect(res[6]).toBe("flood_repeat");
  });
  it("pesan sama berulang = duplicate", () => {
    let t = 0;
    const g = new FloodGuard(() => t);
    const r = [0, 1, 2].map(() => {
      t += 15_000;
      return g.check(1, 9, "Ayo beli ebook murah", fr);
    });
    expect(r).toEqual(["ok", "ok", "duplicate"]);
  });
  it("pengguna berbeda tidak saling memengaruhi", () => {
    const t = 0;
    const g = new FloodGuard(() => t);
    for (let i = 0; i < 5; i++) g.check(1, 1, `a${i}`, fr);
    expect(g.check(1, 2, "halo", fr)).toBe("ok");
  });
  it("jendela waktu bergeser", () => {
    let t = 0;
    const g = new FloodGuard(() => t);
    for (let i = 0; i < 5; i++) {
      t += 1000;
      g.check(1, 1, `a${i}`, fr);
    }
    t += 11_000;
    expect(g.check(1, 1, "lagi", fr)).toBe("ok");
  });
});
