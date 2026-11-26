import "server-only";
import { z } from "zod";

const Env = z.object({
  WEB_DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//),
  /** Rahasia penanda sesi Better Auth (acak, ≥ 32 karakter). */
  BETTER_AUTH_SECRET: z.string().min(32),
  TRYOUT_ORIGIN: z.url().default("https://tryout.catatanabdinegara.site"),
  ADMIN_ORIGIN: z.url().default("https://admin.catatanabdinegara.site"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

function load() {
  const cleaned = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ""));
  const r = Env.safeParse(cleaned);
  if (!r.success) {
    throw new Error(
      `Konfigurasi web tidak valid: ${r.error.issues.map((i) => i.path.join(".")).join(", ")}`,
    );
  }
  return r.data;
}

export const env = load();
export const hostOf = (origin: string) => new URL(origin).host;
