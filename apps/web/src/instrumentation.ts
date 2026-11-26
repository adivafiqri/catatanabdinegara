// Dijalankan sekali saat server Next.js menyala: tabel login Better Auth + penjadwal kumpul otomatis.
// Migrasi tabel bank soal/tryout dijalankan SEBELUM server start oleh scripts/migrasi.ts.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getMigrations } = await import("better-auth/db/migration");
  const { auth } = await import("./lib/auth");
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();
  console.info("[web] tabel login siap");

  // Kumpulkan otomatis ujian yang lewat batas waktu (mis. peserta menutup HP).
  const { tryout } = await import("./lib/db");
  const { errText } = await import("./lib/log");
  setInterval(() => {
    tryout
      .finalizeExpired()
      .catch((e: unknown) => console.error("[web] finalizeExpired:", errText(e)));
  }, 30_000).unref();
}
