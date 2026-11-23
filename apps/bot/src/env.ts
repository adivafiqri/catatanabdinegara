import { z } from "zod";

const idList = z
  .string()
  .default("")
  .transform((s) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map(Number),
  )
  .refine((a) => a.every((n) => Number.isSafeInteger(n)), "harus daftar angka dipisah koma");

const EnvSchema = z
  .object({
    TELEGRAM_BOT_TOKEN: z.string().regex(/^\d+:[\w-]{30,}$/, "format token BotFather tidak valid"),
    BOT_DATABASE_URL: z
      .string()
      .regex(
        /^(postgres(ql)?:\/\/|pglite:\/\/\/)/,
        "harus postgres://... atau pglite:///folder/data",
      ),
    BOT_MODE: z.enum(["polling", "webhook"]).default("polling"),
    TELEGRAM_WEBHOOK_SECRET: z
      .string()
      .regex(/^[A-Za-z0-9_-]{32,256}$/, "minimal 32 karakter A-Z a-z 0-9 _ -")
      .optional(),
    WEBHOOK_URL: z.url().optional(),
    PORT: z.coerce.number().int().positive().default(8080),
    /**
     * Grup yang dilayani bot. Grup lain akan ditinggalkan.
     * Kosong = MODE PERSIAPAN: bot hanya menjawab /id agar ID grup bisa diketahui.
     */
    ALLOWED_CHAT_IDS: idList,
    /** Grup/chat privat moderator untuk notifikasi. Opsional. */
    MOD_CHAT_ID: z.coerce.number().int().optional(),
    /** Moderator tambahan selain admin grup. */
    MODERATOR_IDS: idList,
  })
  .superRefine((e, ctx) => {
    if (e.BOT_MODE === "webhook" && !e.TELEGRAM_WEBHOOK_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["TELEGRAM_WEBHOOK_SECRET"],
        message: "wajib di mode webhook",
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  // Baris "NAMA=" (kosong) di .env berarti "tidak diisi", bukan string kosong.
  // Spasi di tepi nilai juga dibuang (mis. "TOKEN= 123:abc").
  const cleaned = Object.fromEntries(
    Object.entries(source)
      .map(([k, v]) => [k, typeof v === "string" ? v.trim() : v] as const)
      .filter(([, v]) => v !== ""),
  );
  const r = EnvSchema.safeParse(cleaned);
  if (!r.success) {
    // Hanya nama variabel & alasan yang dicetak, tidak pernah nilainya.
    const lines = r.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Konfigurasi .env tidak lengkap/valid:\n${lines}`);
  }
  return r.data;
}
