# Rencana Kerja

Versi 0.1 · 23 November 2026

Aturan: setiap milestone diakhiri dengan **tes lulus → code review (ECC `code-reviewer` + reviewer TS) → security review (ECC `security-reviewer`) → commit & push → berhenti, tunggu konfirmasi pemilik.** Tugas ditulis kecil agar bisa dicentang satu per satu.

---

## Milestone 0: Kerangka & desain (sekarang)
- [x] Pasang ECC & skill frontend-design
- [x] Dokumen PRD, arsitektur, skema, keamanan, arah desain, rencana, struktur repo
- [x] Mockup 3 arah visual (390px)
- [x] **Pemilik memilih arah desain & menjawab pertanyaan terbuka**

### Keputusan pemilik (23 Nov 2026)
| Hal | Keputusan |
| --- | --- |
| Arah desain | **C. Buku Tempel Misi** |
| Persetujuan < 18 tahun | Cukup **centang** "sudah mendapat izin orang tua/wali" (lihat KEAMANAN.md §3.3) |
| Domain | **catatanabdinegara.site** |
| Grup Telegram | Sudah ada |
| Hosting bot | **VPS milik pemilik** (mode polling, database PGlite berbasis file) |
| Target soal sebelum peluncuran | **1 paket SKD penuh = 110 soal** (30 TWK + 35 TIU + 45 TKP), dikonfirmasi pemilik |

## Milestone 1: Bot Telegram dasar (target: pertengahan Desember 2026)
Prasyarat dari pemilik: token bot dari @BotFather (disimpan sendiri di `.env`, **tidak dikirim lewat chat**), grup uji, grup asli. Panduan: `docs/runbook/deploy-bot.md`.

Catatan pelaksanaan: Turborepo ditunda (cukup `pnpm -r` selama baru ada 2 paket). Tabel bot ada di schema Postgres `bot`. Database di VPS memakai PGlite berbasis file; pindah ke Supabase di M2/M3.

1. [x] Inisialisasi monorepo pnpm (Turborepo ditunda), TS strict, ESLint, Prettier, Vitest, `.env.example`, `.gitignore`, gitleaks, CI dasar
2. [x] `packages/db`: Drizzle + migrasi tabel schema `bot` + RLS; tes & VPS memakai PGlite (Supabase CLI butuh Docker, tidak ada di VPS)
3. [x] `apps/bot`: kerangka grammY, mode polling (lokal) & webhook (prod) + verifikasi secret header
4. [x] Pemuat `bot_settings` dengan cache 60 dtk + nilai default
5. [x] Sapaan anggota baru: bisukan → kirim sapaan bertombol → hapus sapaan sebelumnya
6. [x] Verifikasi: klik tombol → buka bisu; penjadwal per menit memindai `bot_pending_verifications` → kick + hapus sapaan
7. [x] Detektor spam (fungsi murni, diuji unit): link non-whitelist, undangan grup, kata terlarang (normalisasi huruf/angka pengganti, mis. "j0kI"), flood, pesan media/link dari anggota baru
8. [x] Tangga peringatan 1 → 2 → bisu 24 jam → kirim notifikasi ke moderator
9. [x] Perintah moderator: `/warn` (balas pesan), `/unwarn`, `/mute`, `/unmute`, `/kata tambah|hapus`, `/domain tambah|hapus`, `/riwayat @user`
10. [x] Perintah umum: `/start`, `/aturan`, `/tryout`, `/materi`, `/jadwal`
11. [x] Pesan terjadwal (`bot_scheduled_posts`), termasuk anti-penipuan; tidak dobel walau restart (kunci baris `FOR UPDATE SKIP LOCKED`)
12. [x] Layanan systemd + panduan deploy (`docs/runbook/deploy-bot.md`) + health check mode webhook. Dockerfile ditunda (VPS tanpa Docker)
13. [x] Diuji pemilik langsung di grup asli "Catatan Abdi Negara" (23 Nov 2026): anti-spam & tombol verifikasi berjalan. Bot berjalan sebagai layanan systemd di VPS (linger aktif). Pemantauan beberapa hari tetap dilakukan sambil M2 dikerjakan.
**Tes:** unit test detektor spam & tangga peringatan (≥ 90% cakupan modul moderasi); tes integrasi handler dengan update Telegram tiruan; uji manual daftar periksa di grup uji.

## Milestone 2: Admin bank soal (target: awal Januari 2027)
**Bagian A (selesai):** fondasi tanpa layanan luar: template CSV, `pnpm soal:cek`, skema & layanan bank soal (impor all-or-nothing, riwayat versi, alur status), panduan `docs/PANDUAN-ISI-SOAL.md`.
**Bagian B (menunggu Supabase):** panel admin web, butir 3–7, 9, 10.

1. [x] `packages/shared`: model & validator soal, aturan SKD (rule set) bawaan 110 soal/100 menit, impor CSV/JSON, ekspor, cek kelengkapan paket
2. [x] Migrasi: subtests, sub_topics, rule_sets, questions, question_options, question_revisions, schools (+RLS); seed subtes, sub-materi, sekolah, aturan SKD
3. [ ] `apps/web` kerangka Next.js + Supabase Auth + peran admin + MFA wajib
4. [ ] Daftar soal (filter subtes/sub-materi/status/tingkat, cari)
5. [ ] Form soal + pratinjau tampilan ujian + unggah gambar (WebP)
6. [ ] Alur status draf → tinjau → terbit → arsip; riwayat revisi
7. [ ] Impor CSV/ZIP & JSON: validasi → laporan per baris → simpan (transaksi)
8. [~] Ekspor JSON/CSV (fungsi siap di `BankRepo.exportAll` + `toBankJson`/`toCsv`); job cadangan mingguan menyusul bersama panel web
9. [ ] Editor rule set (versi) dengan penanda "ambang batas terverifikasi"
10. [ ] Panel pengaturan bot (kata terlarang, whitelist, teks) di web
**Tes:** unit validator impor (file benar, kunci ganda, bobot TKP kembar, kolom hilang, UTF-8 aneh); tes RLS (non-admin tidak bisa membaca soal); E2E admin membuat & menerbitkan 1 soal.

## Milestone 3: Web tryout MVP (target: Februari 2027)
1. [ ] Sistem desain (token, komponen) sesuai arah desain terpilih
2. [ ] Beranda, materi, kebijakan privasi, syarat, disclaimer, footer wajib
3. [ ] Daftar/masuk (email, Google), verifikasi email, profil, alur wali < 18
4. [ ] Paket & event (admin)
5. [ ] `scoreAttempt()` murni di shared + tes tabel lengkap
6. [ ] API attempt: mulai, ambil soal (tanpa kunci), simpan batch, selesai, auto-submit
7. [ ] Halaman ujian mirip CAT: panel nomor, ragu, timer server, mode offline (antre lokal), konfirmasi selesai
8. [ ] Hasil + ekspresi maskot sesuai skor + pembahasan
9. [ ] Leaderboard Redis (event & mingguan, filter sekolah, peringkat sendiri) + `lb:rebuild`
10. [ ] Deteksi skor janggal + halaman tinjau admin
11. [ ] Riwayat, unduh data, hapus akun
12. [ ] Analitik dasar + UTM
13. [ ] Uji beban k6 (2.000 VU) di staging + perbaikan
14. [ ] Audit Lighthouse & aksesibilitas di HP murah sungguhan
**Tes:** unit penilaian; integrasi API attempt (deadline, kunci tidak bocor, percobaan pertama); E2E Playwright 390px: daftar → tryout → refresh di tengah → selesai → hasil → leaderboard; uji beban.

## Milestone 4: Integrasi bot ↔ web (Maret 2027)
API bot bertoken, `/peringkat`, pengumuman 10 besar lewat `bot_outbox`, pengingat event, kuis harian (poll quiz).

## Milestone 5: Fitur seru (Maret–April 2027)
Lencana, streak, mini kuis 5 soal, grafik nilai, analisis sub-materi, kartu hasil 1080×1920 (dirender server dengan `@vercel/og`/Satori).

## Milestone 6: Premium (Mei 2027)
Pilih gateway (Midtrans/Xendit/Duitku atau lynk.id), paket terkunci, webhook idempoten, voucher/bundling, kebijakan refund, pindah ke paket hosting komersial.

---

## Strategi testing

| Lapisan | Alat | Apa yang diuji | Target |
| --- | --- | --- | --- |
| Unit | Vitest | Fungsi murni: penilaian, pengacakan (deterministik dengan seed), detektor spam, validator impor, aturan lencana | ≥ 90% di `packages/shared` & modul moderasi |
| Integrasi | Vitest + Supabase lokal | Route handler + DB sungguhan, kebijakan RLS, handler bot dengan update tiruan | Semua endpoint penting |
| E2E | Playwright (viewport 390×844, throttling 4G lambat) | Alur pengguna & admin utama | Alur kritis M3 |
| Beban | k6 | Mulai serentak, simpan jawaban, selesai serentak, leaderboard | 2.000 VU, p95 simpan < 500 ms, 0 jawaban hilang |
| Manual | Daftar periksa | Bot di grup uji, HP Android murah sungguhan | Tiap milestone |
| Keamanan | gitleaks, `pnpm audit`, ECC security-reviewer | Secret, dependensi, logika akses | Tiap PR / milestone |

Pendekatan **TDD** (ECC `tdd-guide`) dipakai untuk modul berisiko tinggi: penilaian, anti-curang, detektor spam, impor soal.

## Pertanyaan terbuka (gerbang sebelum M1)
Lihat ringkasan Tahap 0. Jawaban dicatat kembali di dokumen ini.
