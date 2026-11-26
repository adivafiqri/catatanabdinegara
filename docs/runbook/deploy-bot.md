# Runbook: Menjalankan Bot Telegram di VPS

Berlaku untuk server ini (`/home/dipsy`), mode **polling**. Database: **PostgreSQL lokal** (lihat `docs/runbook/database.md`); sebelum 26 Nov 2026 memakai PGlite berbasis file. Tidak perlu domain, HTTPS, Docker, atau sudo, kecuali satu perintah di langkah 6.

---

## 1. Buat bot di BotFather (sekali)
1. Di Telegram buka **@BotFather** → `/newbot` → isi nama (mis. "Kakak Tingkat CAN") dan username (harus diakhiri `bot`).
2. Simpan token yang diberikan. **Jangan kirim token ke siapa pun, termasuk lewat chat dengan Claude.**
3. Masih di BotFather:
   - `/setjoingroups` → pilih bot → **Enable**
   - `/setprivacy` → pilih bot → **Disable** (agar bot bisa membaca semua pesan grup untuk anti-spam)
   - `/setcommands` → pilih bot → tempel:
     ```
     tryout - Link tryout SKD gratis
     materi - Daftar materi SKD
     jadwal - Jadwal seleksi & tryout
     aturan - Aturan grup
     ```

## 2. Isi `.env`
```bash
cd ~/catatanabdinegara
cp .env.example .env
chmod 600 .env
nano .env        # isi TELEGRAM_BOT_TOKEN, biarkan ALLOWED_CHAT_IDS kosong dulu
mkdir -p -m 700 ~/catatanabdinegara-data   # berisi data pribadi anggota: hanya bisa dibaca Anda
```

## 3. Mode persiapan: cari ID grup
```bash
cd ~/catatanabdinegara/apps/bot && pnpm dev
```
1. Tambahkan bot ke grup diskusi → jadikan **admin** dengan izin: *Delete messages*, *Ban users* (membatasi anggota). Izin lain tidak perlu.
2. Ketik `/id` di grup → bot membalas `ID grup ini: -100…`.
3. (Opsional) Buat grup kecil khusus moderator, tambahkan bot, ketik `/id` → itu `MOD_CHAT_ID`.
4. Hentikan dengan `Ctrl+C`, lalu isi `ALLOWED_CHAT_IDS` (dan `MOD_CHAT_ID`) di `.env`.

> Mulailah di **grup uji** dulu (PRD M1 langkah 13): buat grup baru dengan 2–3 akun, coba semua alur, baru pindah ke grup asli dengan mengganti `ALLOWED_CHAT_IDS`.

## 4. Coba jalan di depan
```bash
cd ~/catatanabdinegara/apps/bot && pnpm dev
```
Log yang benar: `[main] bot @namabot siap (mode polling)`.

## 5. Pasang sebagai layanan (jalan terus & hidup lagi setelah reboot)
```bash
mkdir -p ~/.config/systemd/user
cp ~/catatanabdinegara/deploy/can-bot.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now can-bot
systemctl --user status can-bot
journalctl --user -u can-bot -f       # lihat log
```

## 6. Agar tetap jalan saat Anda logout (sekali, butuh sudo)
```bash
sudo loginctl enable-linger dipsy
```

## Perintah sehari-hari
| Keperluan | Perintah |
| --- | --- |
| Lihat log | `journalctl --user -u can-bot -f` |
| Restart (setelah ubah `.env`/kode) | `systemctl --user restart can-bot` |
| Berhenti | `systemctl --user stop can-bot` |
| Update kode | `cd ~/catatanabdinegara && git pull && pnpm install --frozen-lockfile && systemctl --user restart can-bot` |

## Cadangan database
Lihat `docs/runbook/database.md` (cadangan otomatis harian).

## Rotasi token (jika bocor)
BotFather → `/revoke` → pilih bot → ganti `TELEGRAM_BOT_TOKEN` di `.env` → `systemctl --user restart can-bot`.
