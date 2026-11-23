import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { webhookCallback } from "grammy";
import { openDb } from "@can/db/client";
import { ALLOWED_UPDATES, createBot } from "./bot.js";
import type { Deps } from "./core.js";
import { loadEnv } from "./env.js";
import { errText } from "./lib/log.js";
import { ModeratorCheck } from "./lib/moderators.js";
import { Repo } from "./lib/repo.js";
import { FloodGuard } from "./moderation/flood.js";
import { dailyMaintenance, seedDefaultPosts, tick } from "./scheduler.js";
import { SettingsStore } from "./settings.js";

const TICK_MS = 20_000;
const DAY_MS = 86_400_000;

async function main() {
  const env = loadEnv();
  const { db, close } = await openDb(env.BOT_DATABASE_URL);
  if (env.ALLOWED_CHAT_IDS.length === 0) {
    console.warn(
      "[main] MODE PERSIAPAN: ALLOWED_CHAT_IDS kosong. Ketik /id di grup untuk melihat ID-nya.",
    );
  }

  const deps = {
    env,
    repo: new Repo(db),
    settings: new SettingsStore(db),
    flood: new FloodGuard(),
    now: () => new Date(),
  } as Omit<Deps, "mods"> as Deps;
  const bot = createBot(env.TELEGRAM_BOT_TOKEN, deps);
  deps.mods = new ModeratorCheck(bot.api, env.MODERATOR_IDS);

  await bot.init();
  console.info(`[main] bot @${bot.botInfo.username} siap (mode ${env.BOT_MODE})`);
  await seedDefaultPosts(deps);

  let ticking = false;
  const timer = setInterval(async () => {
    if (ticking) return;
    ticking = true;
    try {
      await tick(bot.api, deps);
    } catch (e) {
      console.error("[tick] gagal:", errText(e));
    } finally {
      ticking = false;
    }
  }, TICK_MS);
  // Retensi dijalankan saat start juga, supaya tetap jalan walau bot sering di-restart.
  const maintain = () => dailyMaintenance(deps).catch((e) => console.error("[harian]", errText(e)));
  void maintain();
  const daily = setInterval(maintain, DAY_MS);

  let server: ReturnType<typeof createServer> | null = null;
  if (env.BOT_MODE === "webhook") {
    const handle = webhookCallback(bot, "http", {
      secretToken: env.TELEGRAM_WEBHOOK_SECRET!,
      timeoutMilliseconds: 9_000,
      // Update yang lambat dibiarkan selesai di latar; jangan lempar error (bisa mematikan proses).
      onTimeout: "return",
    });
    const expected = Buffer.from(env.TELEGRAM_WEBHOOK_SECRET!);
    server = createServer((req, res) => {
      if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "content-type": "text/plain" }).end("ok");
        return;
      }
      if (req.method !== "POST" || req.url !== "/telegram") {
        res.writeHead(404).end();
        return;
      }
      // Tolak lebih awal tanpa membocorkan perbandingan (grammY juga memeriksa).
      const got = Buffer.from(String(req.headers["x-telegram-bot-api-secret-token"] ?? ""));
      if (got.length !== expected.length || !timingSafeEqual(got, expected)) {
        res.writeHead(401).end();
        return;
      }
      handle(req, res).catch((e) => {
        console.error("[webhook] gagal memproses:", errText(e));
        if (!res.headersSent) res.writeHead(500).end();
      });
    });
    server.listen(env.PORT, () =>
      console.info(`[main] webhook mendengarkan di :${env.PORT}/telegram`),
    );
  } else {
    await bot.api.deleteWebhook();
    void bot.start({ allowed_updates: [...ALLOWED_UPDATES], drop_pending_updates: false });
  }

  const shutdown = async (sig: string) => {
    console.info(`[main] ${sig} diterima, berhenti...`);
    clearInterval(timer);
    clearInterval(daily);
    if (server) server.close();
    else await bot.stop();
    await close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((e) => {
  console.error("[main] gagal start:", errText(e));
  process.exit(1);
});
