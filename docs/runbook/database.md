# Runbook: Database (PostgreSQL 17 di server)

Dipasang dengan `sudo bash scripts/pasang-postgres.sh` (repo resmi PGDG). Hanya mendengarkan di `127.0.0.1:5432`, tidak terbuka ke internet.

## Susunan
| Database | Schema | Pemilik (role) | Dipakai oleh |
| --- | --- | --- | --- |
| `catatanabdinegara` | `bot` | `bot_rw` | Bot Telegram (`BOT_DATABASE_URL`) |
| `catatanabdinegara` | `public`, `drizzle` | `can_web` | Web & panel admin (`WEB_DATABASE_URL`) |

- Role `dipsy` (login lewat socket lokal tanpa password) punya CREATEDB/CREATEROLE untuk administrasi, tetapi **tidak** bisa membaca isi tabel bot/web.
- `bot_rw` tidak bisa membaca bank soal/kunci jawaban; `can_web` tidak bisa membaca/mengubah data bot (sudah diuji 26 Nov 2026).
- Password role ada di `.env` (izin 600), dibuat acak dan tidak pernah ditampilkan.
- Tabel dibuat oleh migrasi saat aplikasi start (`packages/db/migrations/{bot,web}`).

## Cadangan
- Otomatis tiap hari 02.30 WIB: timer `can-cadangan` → `scripts/cadangan-db.sh` → `~/cadangan-db/{bot,web}_TANGGAL.dump` (disimpan 14 hari, dicek bisa dibaca).
- Manual: `pnpm db:cadangan`
- Status timer: `systemctl --user list-timers can-cadangan.timer`
- **Belum ada cadangan di luar server** → wajib ditambahkan (lihat RENCANA-KERJA).

## Memulihkan (latihan atau darurat)
```bash
createdb -h /var/run/postgresql uji_pulih
pg_restore -h /var/run/postgresql -d uji_pulih --no-owner --no-privileges ~/cadangan-db/bot_TANGGAL.dump
pg_restore -h /var/run/postgresql -d uji_pulih --no-owner --no-privileges ~/cadangan-db/web_TANGGAL.dump
# periksa, lalu: dropdb -h /var/run/postgresql uji_pulih
```
Pesan `schema "public" already exists` saat memulihkan berkas web wajar dan bisa diabaikan.

## Riwayat
- 26 Nov 2026: bot dipindah dari PGlite (`~/catatanabdinegara-data/bot`, disimpan sebagai cadangan) ke PostgreSQL dengan `scripts/pindah-bot-ke-postgres.ts`.
