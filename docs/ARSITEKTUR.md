# Arsitektur

Versi 0.1 · 23 November 2026 · Status: **draf**

Prioritas (dari brief): **murah**, **mudah dirawat satu orang**, **tahan lonjakan saat event serentak**.

---

## 0. Perubahan keputusan (26 Nov 2026): semua di server milik pemilik

Pemilik memiliki server fisik sendiri (Ubuntu 22.04, 4 core, 7,7 GB RAM, Jakarta) dan memilih **semua berjalan di server ini** agar biaya tetap Rp0 dan pengerjaan bisa ditangani penuh. Ini **menggantikan** Supabase, Upstash, dan Vercel pada tabel di bawah.

| Bagian | Sebelumnya | Sekarang |
| --- | --- | --- |
| Database | Supabase (Singapura) | **PostgreSQL 17** di server (repo resmi PGDG), hanya localhost |
| Auth | Supabase Auth | **Better Auth** (open source): email+password, Google, TOTP untuk admin |
| Hosting web | Vercel | **Next.js di server** (systemd), dibuka lewat **Cloudflare Tunnel** (tanpa membuka port) |
| Halaman statis | — | Cloudflare Workers Static Assets (`apps/landing`) |
| Cache/rate limit | Upstash Redis | Tabel Postgres + cache CDN Cloudflare; Valkey/Redis lokal bila uji beban membutuhkan |
| Perlindungan admin | MFA | MFA **+ Cloudflare Access** (hanya email pemilik) |
| Bot | PGlite file | Dipindah ke PostgreSQL yang sama (schema `bot`, role `bot_rw`) |
| Email transaksional | Supabase | Penyedia SMTP (mis. Resend), dibutuhkan mulai M3 |
| Cadangan | Otomatis Supabase | `pg_dump` harian terenkripsi ke luar server (wajib) |

Kelebihan: data pribadi tersimpan di Indonesia, latensi rendah, tanpa biaya bulanan tambahan. Risiko yang diterima: server = satu titik gagal (listrik, internet, disk) → mitigasi: UPS, backup harian di luar server, pemantauan uptime, uji beban sebelum event besar (upgrade RAM/CPU bila perlu).

## 1. Ringkasan keputusan

| Bagian | Pilihan | Alasan singkat |
| --- | --- | --- |
| Bahasa | **TypeScript** di semua bagian | Satu bahasa untuk web, bot, dan kode bersama (aturan penilaian, validasi soal). Satu orang cukup menguasai satu ekosistem. |
| Web | **Next.js (App Router)** | Halaman publik bisa statis/di-cache CDN, halaman ujian ringan, API route di repo yang sama. |
| Database + Auth + Storage | **Supabase** (PostgreSQL, Auth email + Google, Storage untuk gambar soal), region Singapura | Postgres sungguhan (bisa pindah keluar kapan saja), auth sudah jadi, Row Level Security, gratis untuk pengembangan. |
| Cache & rate limit | **Upstash Redis** (serverless, region Singapura) | Leaderboard pakai *sorted set*, rate limit per IP/akun, bayar per pemakaian. |
| Hosting web | **Vercel** | Deploy dari GitHub, CDN, gratis untuk dev. **Catatan:** paket Hobby melarang pemakaian komersial → pindah ke Pro saat premium (Mei 2027) atau dari awal bila sudah ada iklan/afiliasi. |
| Bot | **grammY** (Node/TS), **mode webhook**, layanan terpisah dalam container kecil | Bot moderasi harus tetap jalan walau web sedang deploy/diserbu trafik. Timer verifikasi & jadwal posting butuh proses yang selalu hidup. |
| Hosting bot | **VPS milik pemilik** (diputuskan 23 Nov 2026), mode polling, layanan systemd pengguna | Tanpa biaya tambahan; tidak perlu domain/HTTPS. Panduan: `docs/runbook/deploy-bot.md`. |
| Database bot (M1) | **PGlite** berbasis file di VPS, schema `bot` | Postgres tertanam: kode & migrasi sama dengan Supabase, pindah cukup ganti `BOT_DATABASE_URL`. Batasan: hanya satu proses. |
| ORM / migrasi | **Drizzle ORM** + migrasi SQL di repo | Skema terketik di TS, SQL tetap terbaca, cocok dengan Supabase. |
| Validasi | **Zod** di `packages/shared` | Skema impor soal, input API, dan konfigurasi SKD divalidasi dengan kode yang sama di web & bot. |
| Tes | **Vitest** (unit/integrasi), **Playwright** (E2E di viewport 390px) | |
| Monitoring | **Sentry** (paket gratis) + log terstruktur + Upptime/UptimeRobot | |

### Perkiraan biaya bulanan (harga perlu dicek ulang saat membeli)

| Fase | Komponen | Perkiraan |
| --- | --- | --- |
| Dev (Nov 2026–Jan 2027) | Supabase Free, Vercel Hobby, Upstash Free, bot di VPS/Railway | ± US$5 + domain (± Rp150–250 rb/tahun untuk .com/.id) |
| Peluncuran web (Feb 2027) | Supabase Pro (paket Free dijeda setelah 7 hari tidak aktif & tanpa backup harian) | ± US$30 |
| Premium & musim seleksi (Mei–Okt 2027) | + Vercel Pro, Upstash bayar-per-pakai | ± US$55–70 |

**Alternatif lebih murah** bila anggaran ketat: web di Cloudflare Workers (OpenNext) yang boleh dipakai komersial di paket gratis. Konsekuensinya: konfigurasi lebih rumit dan ada beberapa fitur Next.js yang terbatas. Saya sarankan memulai dengan Vercel, lalu memutuskan lagi di Milestone 6.

### Yang sengaja **tidak** dipilih

- **Microservice / Kubernetes**: berlebihan untuk satu perawat.
- **Firebase**: model data dokumen menyulitkan laporan, leaderboard, dan relasi soal–paket–attempt.
- **Bot di dalam fungsi serverless Vercel**: tidak ada timer persisten (kick setelah X menit) dan cron Hobby hanya harian.
- **Python untuk bot**: python-telegram-bot/aiogram bagus, tetapi memecah kode bersama (validasi soal, aturan skor) menjadi dua bahasa.

## 2. Diagram komponen

```
                        ┌──────────────────────────────┐
  HP peserta ──HTTPS──▶ │  Vercel CDN + Next.js (web)  │
  (390px, 4G lambat)    │  • halaman publik (cache)    │
                        │  • halaman ujian (SSR ringan)│
  Laptop admin ───────▶ │  • /admin (role admin + MFA) │
                        │  • /api/* (route handlers)   │
                        └───────┬─────────────┬────────┘
                                │             │
                     Postgres   │             │  ZADD / ZREVRANGE
                    (pooler)    ▼             ▼  rate limit
                ┌──────────────────────┐  ┌────────────────┐
                │ Supabase             │  │ Upstash Redis  │
                │ • Postgres + RLS     │  │ • lb:event:{id}│
                │ • Auth (email,Google)│  │ • lb:week:{iso}│
                │ • Storage (gambar)   │  │ • rl:*         │
                │ • backup harian      │  └────────────────┘
                └──────────┬───────────┘
                           │ Postgres (role terbatas: bot_rw)
                           │ + API web bertoken (leaderboard, soal kuis)
                ┌──────────┴───────────┐         ┌──────────────────┐
                │ Bot grammY (container)│◀─webhook─│ Telegram Bot API │
                │ • moderasi & peringatan│─────────▶│ Grup + Channel   │
                │ • penjadwal per menit  │          └──────────────────┘
                │ • kuis harian          │
                └────────────────────────┘
```

### Hubungan web ↔ bot

| Kebutuhan | Cara | Alasan |
| --- | --- | --- |
| Data milik bot (peringatan, pengaturan, jadwal, log tindakan) | Bot membaca/menulis tabel `bot_*` langsung di Postgres dengan role `bot_rw` yang **hanya** punya akses ke tabel `bot_*` | Cepat, tidak bergantung pada web |
| Leaderboard, soal kuis harian, jadwal event | Bot memanggil **API web** `GET /api/bot/v1/...` dengan header `Authorization: Bearer <BOT_API_TOKEN>` | Satu pintu untuk data web; kunci jawaban tidak pernah keluar dari logika web kecuali untuk kuis yang memang sudah ditandai |
| Web mengumumkan hasil event ke Telegram | Web menulis baris ke `bot_outbox`; bot mengirim dan menandai terkirim | Web tidak perlu memegang token bot; pengiriman tidak dobel (idempoten) |
| Admin mengubah kata terlarang/whitelist di panel web | Web menulis `bot_settings`; bot memuat ulang setiap 60 detik | Tanpa deploy ulang (brief §4) |

## 3. Alur tryout (inti sistem)

```
Peserta            Web (API)                         Postgres              Redis
  │ Mulai ───────▶ cek event buka & belum pernah ikut
  │                buat attempt: started_at, deadline,
  │                urutan soal & opsi acak (disimpan) ─▶ attempts
  │ ◀── soal TANPA kunci/bobot, posisi terakhir
  │
  │ jawab/ragu ──▶ (debounce 2 dtk di browser, kirim batch)
  │                tolak jika now() > deadline + 30 dtk
  │                upsert 1 baris JSON jawaban ───────▶ attempts.answers_draft
  │   (offline: antre di localStorage, kirim saat online)
  │
  │ Selesai ─────▶ kunci attempt (status=selesai), hitung skor di server
  │                dengan rule_set versi attempt ─────▶ attempt_answers, skor
  │                cek kejanggalan → flag
  │                jika percobaan pertama & tidak janggal ────────────────▶ ZADD lb
  │ ◀── skor + pembahasan
```

- **Jawaban tersimpan sebagai satu baris JSON per attempt** selama ujian, sehingga 1 penyimpanan = 1 `UPDATE`, bukan 110 baris. Saat selesai, jawaban dinormalisasi ke `attempt_answers` untuk pembahasan dan statistik.
- **Waktu habis tanpa klik selesai**: job tiap menit (di bot/cron) dan pemeriksaan saat attempt dibuka lagi akan mengumpulkan otomatis attempt yang lewat deadline.
- **Skor dihitung hanya di server**, dengan fungsi murni `scoreAttempt(ruleSet, answers, keys)` di `packages/shared`. Fungsi ini diuji unit secara menyeluruh.

## 4. Mode render per halaman

| Halaman | Mode | Cache |
| --- | --- | --- |
| Beranda, materi, kebijakan | Statis (SSG) | CDN, revalidasi saat deploy |
| Leaderboard | Server, data dari Redis | `s-maxage=30, stale-while-revalidate=60` |
| Halaman ujian | Server shell + client island kecil | Tanpa cache; JS < 60 KB gzip |
| Hasil & pembahasan | Server, butuh login | Tanpa cache |
| Admin | Client-heavy diperbolehkan | Tanpa cache |

## 5. Lingkungan & deploy

| Lingkungan | Web | DB | Bot |
| --- | --- | --- | --- |
| Lokal | `pnpm dev` | Supabase CLI (Docker) | long polling ke **bot uji** di grup uji |
| Staging | Vercel Preview per PR | proyek Supabase "staging" | bot uji, webhook ke staging |
| Produksi | Vercel Production (cabang `main`) | proyek Supabase "prod" | bot asli |

CI (GitHub Actions): lint → typecheck → unit test → build → pemindai secret (gitleaks) → E2E di preview.

## 6. Kesiapan lonjakan trafik (event serentak)

Asumsi beban puncak: **tryout pertama ±200 peserta** (konfirmasi pemilik 26 Nov 2026) → uji beban target 400 (cadangan 2×). Menjelang musim seleksi (Jul–Okt 2027) diuji ulang untuk **2.000 peserta** bersamaan; angka di tabel di bawah memakai skenario 2.000.

| Titik rawan | Beban | Strategi |
| --- | --- | --- |
| Klik "Mulai" serentak | 2.000 permintaan dalam ± 1 menit | Paket soal tanpa kunci di-cache di Redis per paket; pengacakan dilakukan di server dari cache, bukan query 110 soal per orang |
| Simpan jawaban | ± 2.000 / 10 dtk ≈ 200 tulis/dtk | 1 `UPDATE` per batch; koneksi lewat pooler Supabase (mode transaksi); debounce di klien |
| Selesai serentak di menit 100 | 2.000 penilaian dalam ± 1 menit | Penilaian murni di memori, 1 transaksi per attempt; jika antre, tampilkan "Sedang menghitung…" lalu polling |
| Leaderboard dibuka bersamaan | ribuan baca/dtk | Redis sorted set + cache CDN 30 detik |
| Gambar soal figural | bandwidth | Disimpan WebP ≤ 60 KB di Storage + CDN |

Sebelum event besar pertama: **uji beban** dengan k6 terhadap staging (skenario 2.000 pengguna virtual) — masuk RENCANA-KERJA M3.

## 7. Cadangan & pemulihan

- Supabase Pro: backup harian otomatis (7 hari). Ditambah ekspor bank soal mingguan ke penyimpanan terpisah (GitHub Actions → Storage terenkripsi). **Bank soal adalah aset bisnis utama.**
- Redis dianggap cache: leaderboard bisa dibangun ulang dari Postgres dengan satu perintah (`pnpm lb:rebuild`).
- Bot tanpa state di memori: semua timer & jadwal ada di Postgres, jadi restart aman.

## 8. ADR (catatan keputusan arsitektur)

Keputusan besar dicatat di `docs/adr/NNN-judul.md` mulai Milestone 1, dengan format: konteks → keputusan → konsekuensi → alternatif.
