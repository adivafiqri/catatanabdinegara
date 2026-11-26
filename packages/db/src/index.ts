import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as botTables from "./bot-schema.js";
import * as webTables from "./web-schema.js";

export * from "./bot-schema.js";
export * from "./web-schema.js";

export const schema = { ...botTables, ...webTables };

/** Tipe DB: postgres-js (produksi) atau PGlite (VPS/tes). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export * from "./bank.js";
export * from "./tryout.js";
