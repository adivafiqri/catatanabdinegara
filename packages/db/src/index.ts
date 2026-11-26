import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as botTables from "./bot-schema.js";
import * as webTables from "./web-schema.js";

export * from "./bot-schema.js";
export * from "./web-schema.js";

export const schema = { ...botTables, ...webTables };

/** Tipe DB: postgres-js (produksi) atau PGlite (VPS/tes). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/** Migrasi tabel bot (schema `bot`, dijalankan oleh role bot). */
export const botMigrationsFolder = new URL("../migrations/bot", import.meta.url).pathname;
/** Migrasi tabel web/bank soal (schema `public`, dijalankan oleh role admin web). */
export const webMigrationsFolder = new URL("../migrations/web", import.meta.url).pathname;
/** @deprecated nama lama; sama dengan botMigrationsFolder. */
export const migrationsFolder = botMigrationsFolder;
export * from "./bank.js";
export * from "./tryout.js";
