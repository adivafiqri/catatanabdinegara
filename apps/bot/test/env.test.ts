import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/env.js";

const TOKEN = ["123456789", "A".repeat(35)].join(":");

describe("loadEnv", () => {
  it("menerima .env.example yang hanya diisi token (nilai kosong = tidak diisi)", () => {
    const tpl = parseEnv(readFileSync(new URL("../../../.env.example", import.meta.url), "utf8"));
    const env = loadEnv({ ...tpl, TELEGRAM_BOT_TOKEN: TOKEN });
    expect(env.ALLOWED_CHAT_IDS).toEqual([]);
    expect(env.MOD_CHAT_ID).toBeUndefined();
    expect(env.WEBHOOK_URL).toBeUndefined();
    expect(env.BOT_MODE).toBe("polling");
  });

  it("membuang spasi di tepi nilai", () => {
    const env = loadEnv({
      TELEGRAM_BOT_TOKEN: ` ${TOKEN} `,
      BOT_DATABASE_URL: "pglite:///tmp/x",
      ALLOWED_CHAT_IDS: " -1001, -1002 ",
    });
    expect(env.TELEGRAM_BOT_TOKEN).toBe(TOKEN);
    expect(env.ALLOWED_CHAT_IDS).toEqual([-1001, -1002]);
  });

  it("pesan error tidak memuat nilai rahasia", () => {
    expect(() =>
      loadEnv({ TELEGRAM_BOT_TOKEN: "rahasia-salah-format", BOT_DATABASE_URL: "x" }),
    ).toThrow(/TELEGRAM_BOT_TOKEN/);
    try {
      loadEnv({ TELEGRAM_BOT_TOKEN: "rahasia-salah-format", BOT_DATABASE_URL: "x" });
    } catch (e) {
      expect(String(e)).not.toContain("rahasia-salah-format");
    }
  });

  it("mode webhook mewajibkan secret", () => {
    expect(() =>
      loadEnv({
        TELEGRAM_BOT_TOKEN: TOKEN,
        BOT_DATABASE_URL: "pglite:///tmp/x",
        BOT_MODE: "webhook",
      }),
    ).toThrow(/TELEGRAM_WEBHOOK_SECRET/);
  });
});
