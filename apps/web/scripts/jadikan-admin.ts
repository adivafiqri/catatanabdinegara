// Menjadikan akun (yang sudah mendaftar lewat /daftar) sebagai admin.
//   pnpm --filter @can/web admin:jadikan <email>
// Admin wajib memasang verifikasi dua langkah saat pertama masuk panel admin.
import { profiles } from "@can/db";
import { connectDb } from "@can/db/connect";
import { eq, sql } from "drizzle-orm";

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Pakai: pnpm --filter @can/web admin:jadikan <email>");
  process.exit(2);
}
const { db, close } = connectDb(process.env.WEB_DATABASE_URL!, 1);
try {
  const rows = (await db.execute(
    sql`select id from "user" where lower(email) = ${email} limit 1`,
  )) as unknown as { id: string }[];
  const id = rows[0]?.id;
  if (!id) throw new Error("Email belum terdaftar. Daftar dulu lewat halaman /daftar.");
  const r = await db
    .update(profiles)
    .set({ role: "admin" })
    .where(eq(profiles.userId, id))
    .returning({ nick: profiles.nickname });
  if (!r.length) throw new Error("Akun belum melengkapi profil. Masuk lalu lengkapi profil dulu.");
  console.info(
    `OK: ${r[0]!.nick} sekarang admin. Masuk di panel admin lalu pasang verifikasi dua langkah.`,
  );
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await close();
}
