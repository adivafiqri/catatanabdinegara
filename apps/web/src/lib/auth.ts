import "server-only";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { Pool } from "pg";
import { env } from "./env";

const g = globalThis as unknown as { __canPool?: Pool };
const pool = (g.__canPool ??= new Pool({ connectionString: env.WEB_DATABASE_URL, max: 10 }));

export const auth = betterAuth({
  appName: "Catatan Abdi Negara",
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.TRYOUT_ORIGIN,
  trustedOrigins: [
    env.TRYOUT_ORIGIN,
    env.ADMIN_ORIGIN,
    "http://127.0.0.1:3000",
    "http://localhost:3000",
  ],
  database: pool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    // Verifikasi email & reset password menyusul (butuh penyedia email).
    requireEmailVerification: false,
  },
  session: { expiresIn: 60 * 60 * 24 * 14, updateAge: 60 * 60 * 24 },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 120,
    customRules: {
      "/sign-in/email": { window: 900, max: 10 },
      "/sign-up/email": { window: 3600, max: 5 },
      "/two-factor/verify-totp": { window: 300, max: 10 },
    },
  },
  advanced: {
    // Cookie "Secure" selalu aktif di situs HTTPS (produksi); nonaktif hanya untuk uji lokal http.
    useSecureCookies: env.TRYOUT_ORIGIN.startsWith("https:"),
    ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"] },
  },
  plugins: [twoFactor({ issuer: "Catatan Abdi Negara" }), nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
