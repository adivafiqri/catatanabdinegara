# Keamanan & Perlindungan Data

Versi 0.1 · 23 November 2026 · Status: **draf** (bukan nasihat hukum; kebijakan privasi final sebaiknya dibaca ahli hukum)

---

## 1. Model ancaman ringkas

| Ancaman | Dampak | Kendali utama |
| --- | --- | --- |
| Peserta mencari kunci jawaban lewat DevTools/API | Leaderboard tidak bisa dipercaya | Kunci tidak pernah dikirim sebelum selesai (§4) |
| Akun palsu massal untuk mendominasi leaderboard | Leaderboard rusak | Verifikasi email, rate limit daftar, hanya percobaan pertama, tinjau skor janggal |
| Pengambilalihan akun admin | Bank soal dicuri/dirusak | MFA wajib untuk admin, sesi pendek, log audit |
| Kebocoran data pribadi (termasuk anak) | Pelanggaran UU PDP, reputasi | Minimisasi data, RLS, enkripsi, prosedur insiden |
| Spam/penipuan di grup | Anggota tertipu transfer | Bot anti-spam + pesan rutin anti-penipuan + moderator |
| Token bot/API bocor | Bot diambil alih | Secret hanya di env, rotasi, gitleaks di CI |
| Pengurasan bank soal (scraping) | Aset bisnis hilang | Soal hanya muncul per attempt; rate limit; watermark nama panggilan tipis di pembahasan (opsional) |

## 2. Autentikasi & otorisasi

- **Supabase Auth**: email + password, dan login Google. Password di-hash oleh Supabase (bcrypt). Kebijakan minimal: 8 karakter dan cek ke daftar password bocor (fitur Supabase *leaked password protection*).
- Email wajib diverifikasi sebelum bisa ikut event yang masuk leaderboard.
- **Peran:** `user`, `moderator`, `admin` di `profiles.role`. Peran hanya bisa diubah lewat SQL/admin, tidak bisa lewat API pengguna.
- **Admin wajib MFA (TOTP)**. Rute `/admin/*` memeriksa `aal2` di server (middleware + route handler), tidak hanya di tampilan.
- **Row Level Security aktif di semua tabel.** Contoh:
  - `profiles`: pengguna hanya bisa membaca/mengubah barisnya sendiri; leaderboard memakai *view* yang hanya mengekspos `nickname`, `city`, `target_school`, skor.
  - `questions`/`question_options`: **tidak ada akses langsung dari klien**. Semua lewat route handler server memakai service role.
  - `attempts`: pengguna membaca miliknya; menulis hanya lewat route handler.
- Cookie sesi: `HttpOnly`, `Secure`, `SameSite=Lax`. Permintaan yang mengubah data memeriksa origin (proteksi CSRF bawaan Server Actions + cek header `Origin` di route handler).

## 3. Perlindungan data pribadi (UU No. 27 Tahun 2022 tentang PDP)

### 3.1 Data yang dikumpulkan (minimal)

| Data | Wajib? | Alasan | Retensi |
| --- | --- | --- | --- |
| Email | Ya | Login, reset password | Selama akun aktif |
| Nama panggilan | Ya | Leaderboard | Selama akun aktif |
| Kota (kab/kota) | Ya | Leaderboard & analitik | Selama akun aktif |
| Sekolah tujuan | Tidak | Filter leaderboard | Selama akun aktif |
| Tahun lahir | Ya | Menentukan perlu persetujuan wali | Selama akun aktif |
| Email wali | Hanya < 18 | Persetujuan wali | Selama akun aktif |
| Jawaban & skor | Ya | Fitur inti | Selama akun aktif; dianonimkan saat akun dihapus |
| IP | Otomatis | Keamanan, rate limit | Di-hash; dihapus 30 hari |
| Telegram user ID | Tidak (T2) | Tautan akun | Sampai tautan diputus |

**Tidak dikumpulkan:** nama lengkap, NIK, nomor HP, tanggal lahir lengkap, alamat, foto.

### 3.2 Hak subjek data (diwujudkan sebagai fitur)
- Halaman **Kebijakan Privasi** berbahasa sederhana + versi (`consent_privacy_version`).
- **Unduh data saya** (JSON) dan **Hapus akun** di halaman profil (W9). Penghapusan: data pribadi dihapus ≤ 30 hari; skor di leaderboard lama diganti "Peserta terhapus".
- Persetujuan pemasaran terpisah dan default **tidak dicentang**.
- Data tidak dijual atau dibagikan. Pemroses pihak ketiga (Supabase, Vercel, Upstash, Sentry, penyedia email) dicantumkan di kebijakan privasi.
- Lokasi server: Supabase & Upstash di **Singapura** (transfer data ke luar negeri disebutkan di kebijakan privasi, sesuai Pasal 56 UU PDP).

### 3.3 Pengguna di bawah 18 tahun ⚠️ (keputusan pemilik diperlukan)
UU PDP Pasal 25 mewajibkan persetujuan orang tua/wali untuk memproses data pribadi anak. Usulan MVP:
1. Saat daftar, pengguna memilih tahun lahir.
2. Jika < 18 tahun: akun dibuat dalam status **terbatas**. Pengguna bisa mencoba tryout latihan, tetapi **tidak tampil di leaderboard** dan tidak menerima email pemasaran.
3. Pengguna memasukkan email orang tua/wali → wali menerima tautan persetujuan (berlaku 7 hari) → akun menjadi penuh.
4. Wali bisa mencabut persetujuan lewat tautan di email → akun kembali terbatas atau dihapus.

Alternatif yang lebih sederhana tapi lebih berisiko: hanya centang "Saya sudah mendapat izin orang tua/wali". **Perlu keputusan Anda.**

### 3.4 Insiden kebocoran
Prosedur tertulis di `docs/runbook/insiden-data.md` (dibuat M3): putus akses → rotasi secret → nilai dampak → **pemberitahuan tertulis ke subjek data & lembaga paling lambat 3×24 jam** (Pasal 46 UU PDP) → catat pelajaran.

## 4. Anti-curang leaderboard

| Kendali | Implementasi |
| --- | --- |
| Kunci tidak bocor | API soal hanya mengirim `{id, stem, image, options:[{key, text}]}`; `key` adalah label hasil acak per attempt, bukan label asli. `is_correct`/`weight`/`explanation` hanya dikirim setelah `status = submitted`. Ada tes otomatis yang memastikan respons API tidak memuat field tersebut. |
| Acak soal & opsi | `question_order`/`option_order` dibuat server (CSPRNG) per attempt dan disimpan |
| Timer server | `deadline_at` dari server; jawaban setelah `deadline + 30 dtk` ditolak; selisih jam HP tidak berpengaruh |
| Percobaan pertama | Indeks unik `(user_id, event_id) where is_first_in_event`; attempt berikutnya tetap dinilai, tapi tidak masuk leaderboard |
| Skor janggal | Ditandai otomatis bila: durasi < `min_plausible_seconds`; skor ≥ persentil 99 dan durasi < persentil 5; jawaban masuk berbondong (> 30 jawaban dalam 10 dtk); banyak akun dari hash IP yang sama dalam satu event. Admin meninjau di A8. |
| Nama panggilan | Saringan kata kasar & penyamaran ("admin", "official", nama instansi) |
| Bukti | `attempt_answers.answered_at` menyimpan pola waktu untuk audit |

## 5. Penyimpanan secret

- Semua secret ada di **environment variable** (Vercel Project Env, `.env` di VPS bot dengan izin `600`). Repo hanya memuat **`.env.example`** berisi nama variabel & keterangan, tanpa nilai.
- `.gitignore` memuat `.env*` kecuali `.env.example`.
- **gitleaks** di pre-commit (opsional) dan wajib di CI. Build gagal bila ada temuan.
- Pemisahan kunci: `SUPABASE_SERVICE_ROLE_KEY` hanya di server web; bot memakai **role Postgres sendiri (`bot_rw`)** yang hanya bisa menyentuh tabel `bot_*`, ditambah `BOT_API_TOKEN` untuk membaca API web.
- `TELEGRAM_WEBHOOK_SECRET`: bot menolak update yang tidak membawa header `X-Telegram-Bot-Api-Secret-Token` yang benar.
- Rotasi: token bot & API token setiap 6 bulan atau segera bila ada dugaan bocor (prosedur di runbook).

Daftar variabel awal (akan ada di `.env.example`):
```
# web
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
BOT_API_TOKEN=
SENTRY_DSN=
# bot
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
BOT_DATABASE_URL=
WEB_API_BASE_URL=
BOT_API_TOKEN=
```

## 6. Rate limit (Upstash `@upstash/ratelimit`)

| Endpoint | Batas | Kunci |
| --- | --- | --- |
| Daftar | 5 / jam | IP |
| Masuk | 10 / 15 menit | IP + email |
| Lupa password | 3 / jam | email |
| Simpan jawaban | 60 / menit | attempt |
| Mulai attempt | 10 / jam | user |
| API bot `/api/bot/v1/*` | 120 / menit | token |
| Impor soal (admin) | 10 / jam | user |

Respons 429 berisi pesan Indonesia yang jelas + `Retry-After`.

## 7. Keamanan web umum

- Header: `Content-Security-Policy` ketat (tanpa `unsafe-inline` untuk skrip; font dari Google Fonts di-*self-host*), `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal.
- Semua input divalidasi Zod di batas server. Markdown soal dirender dengan daftar tag yang diizinkan (tanpa HTML mentah).
- Unggahan gambar: hanya admin; dicek MIME & ukuran (≤ 500 KB); dikonversi ke WebP di server; metadata EXIF dibuang.
- Webhook pembayaran (P): verifikasi tanda tangan, idempoten berdasarkan `provider_ref`, tidak percaya data harga dari klien.

## 8. Moderasi bot

- Bot hanya meminta hak admin yang perlu: hapus pesan, batasi anggota, ban. **Tidak** butuh hak menambah admin atau mengubah info grup.
- Perintah moderasi (`/warn`, `/unwarn`, `/mute`, `/unmute`, `/setting`) diperiksa terhadap daftar admin grup dari Telegram (di-cache 5 menit) **dan** tabel moderator, bukan nama pengguna.
- Bot tidak pernah meng-kick otomatis anggota terverifikasi; kick setelah bisu adalah **keputusan moderator** (brief §4). Satu-satunya kick otomatis adalah gagal verifikasi masuk.
- Semua tindakan tercatat di `bot_actions` dan bisa dibatalkan. Ringkasan harian dikirim ke chat moderator.
- Pesan rutin: "Admin tidak pernah meminta transfer lewat chat pribadi." Bot juga memperingatkan bila ada akun yang memakai nama mirip admin (opsional, T2).
- Teks peringatan bot tidak mempermalukan: "Pesannya kakak hapus dulu ya, link luar belum boleh di sini (peringatan 1/2)."

## 9. Review keamanan per milestone

Setiap milestone ditutup dengan:
1. Agent ECC **security-reviewer** atas diff milestone.
2. Daftar periksa: OWASP Top 10 relevan, RLS diuji dengan tes "pengguna A tidak bisa membaca data B", tidak ada secret di diff.
3. Temuan kritis/tinggi wajib diperbaiki sebelum commit milestone.
