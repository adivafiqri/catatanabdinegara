import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema, type Db } from "./index.js";

/** Koneksi Postgres TANPA menjalankan migrasi (untuk proses web; migrasi dijalankan sebelum server start). */
export function connectDb(url: string, max = 10): { db: Db; close: () => Promise<void> } {
  const sql = postgres(url, { prepare: false, max, onnotice: () => {} });
  return { db: drizzle(sql, { schema }) as unknown as Db, close: () => sql.end({ timeout: 5 }) };
}
