import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { migrationsFolder, schema, type Db } from "./index.js";

export interface DbHandle {
  db: Db;
  close: () => Promise<void>;
}

const MIGRATE_OPTS = { migrationsFolder, migrationsSchema: "bot" };

/**
 * Membuka database dari URL:
 * - `postgres://...`  Postgres sungguhan (Supabase). `prepare: false` agar cocok dengan pooler mode transaksi.
 * - `pglite:///path/ke/folder`  Postgres tertanam berbasis file (satu proses). Cocok untuk bot di VPS
 *   sebelum ada Supabase. Pindah ke Supabase cukup dengan dump/restore schema `bot`.
 * Migrasi dijalankan otomatis.
 */
export async function openDb(url: string): Promise<DbHandle> {
  if (url.startsWith("pglite://")) {
    const dir = url.slice("pglite://".length);
    const pg = new PGlite(dir);
    await migratePglite(drizzlePglite(pg), MIGRATE_OPTS);
    return { db: drizzlePglite(pg, { schema }) as unknown as Db, close: () => pg.close() };
  }
  const migrator = postgres(url, { prepare: false, max: 1 });
  try {
    await migrate(drizzle(migrator), MIGRATE_OPTS);
  } finally {
    await migrator.end({ timeout: 5 });
  }
  const sql = postgres(url, { prepare: false, max: 5 });
  return { db: drizzle(sql, { schema }) as unknown as Db, close: () => sql.end({ timeout: 5 }) };
}
