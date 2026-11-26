import "server-only";
import { BankRepo, TryoutRepo, type Db } from "@can/db";
import { connectDb } from "@can/db/connect";
import { env } from "./env";

// Satu pool per proses (bertahan saat hot reload di dev).
const g = globalThis as unknown as { __canDb?: Db };
export const db: Db = (g.__canDb ??= connectDb(env.WEB_DATABASE_URL, 15).db);
export const bank = new BankRepo(db);
export const tryout = new TryoutRepo(db);
