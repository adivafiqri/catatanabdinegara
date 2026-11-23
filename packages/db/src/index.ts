import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema.js";

export * from "./schema.js";
export { schema };

/** Tipe DB yang dipakai bot: bisa postgres-js (produksi) atau PGlite (tes). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/** Lokasi folder migrasi SQL (dipakai oleh migrator). */
export const migrationsFolder = new URL("../migrations", import.meta.url).pathname;
