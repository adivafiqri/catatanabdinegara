// Memindahkan data bot dari PGlite (file) ke PostgreSQL. Bot HARUS dihentikan dulu.
//   pnpm tsx scripts/pindah-bot-ke-postgres.ts <pglite:///folder> <postgres://...>
// Aman diulang: tabel tujuan dikosongkan dulu, semua dalam satu transaksi.
import { openDb } from "@can/db/client";
import {
  botActions,
  botChatState,
  botCleanup,
  botMembers,
  botOutbox,
  botPendingVerifications,
  botScheduledPosts,
  botSettings,
  botWarnings,
} from "@can/db";
import { sql } from "drizzle-orm";

const [src, dst] = process.argv.slice(2);
if (!src?.startsWith("pglite://") || !dst?.startsWith("postgres")) {
  console.error("Pakai: tsx scripts/pindah-bot-ke-postgres.ts <pglite:///folder> <postgres://...>");
  process.exit(2);
}
const tables = [
  ["settings", botSettings],
  ["chat_state", botChatState],
  ["members", botMembers],
  ["pending_verifications", botPendingVerifications],
  ["warnings", botWarnings],
  ["actions", botActions],
  ["cleanup", botCleanup],
  ["scheduled_posts", botScheduledPosts],
  ["outbox", botOutbox],
] as const;

const from = await openDb(src, "bot");
const to = await openDb(dst, "bot");
try {
  await to.db.transaction(async (tx) => {
    for (const [, t] of [...tables].reverse()) await tx.delete(t);
    for (const [name, t] of tables) {
      const rows = await from.db.select().from(t);
      for (let i = 0; i < rows.length; i += 500) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await tx.insert(t).values(rows.slice(i, i + 500) as any);
      }
      console.info(`  ${name}: ${rows.length} baris`);
    }
    for (const seq of ["warnings", "actions", "cleanup", "scheduled_posts", "outbox"]) {
      await tx.execute(
        sql.raw(
          `select setval(pg_get_serial_sequence('bot.${seq}','id'), coalesce((select max(id) from bot.${seq}), 0) + 1, false)`,
        ),
      );
    }
  });
  console.info("Selesai: data bot dipindah ke PostgreSQL.");
} finally {
  await from.close();
  await to.close();
}
