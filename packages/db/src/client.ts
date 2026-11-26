import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { schema, type Db } from "./index.js";
import { botMigrationsFolder, webMigrationsFolder } from "./migrations.js";

export interface DbHandle {
  db: Db;
  close: () => Promise<void>;
}

const BOT_MIGRATIONS = { migrationsFolder: botMigrationsFolder, migrationsSchema: "bot" };
const WEB_MIGRATIONS = { migrationsFolder: webMigrationsFolder, migrationsSchema: "drizzle" };

/**
 * Membuka database dari URL:
 * - `postgres://...`  Postgres sungguhan (Supabase). `prepare: false` agar cocok dengan pooler mode transaksi.
 * - `pglite:///path/ke/folder`  Postgres tertanam berbasis file (satu proses). Cocok untuk bot di VPS
 *   sebelum ada Supabase. Pindah ke Supabase cukup dengan dump/restore schema `bot`.
 * Migrasi dijalankan otomatis.
 */
export async function openDb(url: string, which: "bot" | "web" | "all" = "bot"): Promise<DbHandle> {
  const sets =
    which === "all"
      ? [BOT_MIGRATIONS, WEB_MIGRATIONS]
      : [which === "bot" ? BOT_MIGRATIONS : WEB_MIGRATIONS];
  if (url.startsWith("pglite://")) {
    const dir = url.slice("pglite://".length);
    const pg = new PGlite(dir);
    for (const m of sets) await migratePglite(drizzlePglite(pg), m);
    return { db: drizzlePglite(pg, { schema }) as unknown as Db, close: () => pg.close() };
  }
  const migrator = postgres(url, { prepare: false, max: 1, onnotice: () => {} });
  try {
    for (const m of sets) await migrate(drizzle(migrator), m);
  } finally {
    await migrator.end({ timeout: 5 });
  }
  const sql = postgres(url, { prepare: false, max: 5, onnotice: () => {} });
  return { db: drizzle(sql, { schema }) as unknown as Db, close: () => sql.end({ timeout: 5 }) };
}

export { connectDb } from "./connect.js";
