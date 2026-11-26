// Migrasi tabel web (bank soal & tryout) + data referensi. Dijalankan sebelum server web start.
//   pnpm --filter @can/web migrasi
import { BankRepo } from "@can/db";
import { openDb } from "@can/db/client";

const url = process.env.WEB_DATABASE_URL;
if (!url) {
  console.error("WEB_DATABASE_URL belum diisi");
  process.exit(1);
}
const h = await openDb(url, "web");
await new BankRepo(h.db).seedReferenceData();
await h.close();
console.info("[migrasi] tabel web & data referensi siap");
