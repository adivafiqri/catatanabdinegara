// Mendaftarkan URL webhook ke Telegram. Jalankan sekali setelah deploy:
//   pnpm --filter @can/bot set-webhook
import { Api } from "grammy";
import { ALLOWED_UPDATES } from "./bot.js";
import { loadEnv } from "./env.js";

const env = loadEnv();
if (!env.WEBHOOK_URL || !env.TELEGRAM_WEBHOOK_SECRET) {
  console.error(
    "Isi WEBHOOK_URL (https://domain-bot/telegram) dan TELEGRAM_WEBHOOK_SECRET di .env",
  );
  process.exit(1);
}
const api = new Api(env.TELEGRAM_BOT_TOKEN);
await api.setWebhook(env.WEBHOOK_URL, {
  secret_token: env.TELEGRAM_WEBHOOK_SECRET,
  allowed_updates: [...ALLOWED_UPDATES],
  drop_pending_updates: false,
});
const info = await api.getWebhookInfo();
console.info(`Webhook aktif: ${info.url} (pending ${info.pending_update_count})`);
