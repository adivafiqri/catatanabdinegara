# Brief Proyek: Web Tryout & Bot Telegram — "Catatan Abdi Negara"

Dokumen ini adalah konteks lengkap untuk membangun **web tryout gratis (dengan leaderboard)** dan **bot Telegram komunitas**. Bagian video & manajemen proyek ditangani di tempat lain; fokus di sini hanya web dan bot.

Bahasa kerja: **Indonesia**. Pemilik proyek: perwira Polri aktif, mantan taruna sekolah kedinasan, latar IT. Izin instansi untuk usaha sampingan ini **sudah aman**.

---

## 1. Gambaran bisnis

"Catatan Abdi Negara" adalah brand edukasi persiapan **sekolah kedinasan** (STIS, PKN STAN, IPDN, STMKG, Poltek SSN, dll.) di TikTok, Instagram, dan lynk.id. Akun: **@catatan.abdinegara**.

Alur bisnis (funnel):

```
Video TikTok/Reels  →  Web tryout GRATIS  →  Grup Telegram  →  Produk berbayar
   (perhatian)          (bukti manfaat,        (komunitas,       (ebook latihan soal,
                         kumpulkan akun)        info, retensi)    tryout premium, bundling)
```

Satu **bank soal orisinal** dipakai bersama oleh: tryout gratis, tryout premium, kuis harian Telegram, dan ebook. Jadi struktur data soal harus bisa dipakai ulang di semua kanal.

### Target pengguna
- Siswa SMA/SMK kelas 11–12 dan lulusan 1–2 tahun terakhir (pengguna utama, mayoritas pakai **HP**).
- Orang tua (pengambil keputusan beli).
- Nanti: pelamar CPNS (format SKD sama).

### Timeline (perkiraan, mengikuti kalender seleksi)
| Fase | Waktu | Target untuk web/bot |
| --- | --- | --- |
| Fondasi | Nov–Des 2026 | **Grup Telegram + bot dasar** (sapaan, anti-spam, perintah) |
| Web gratis | Jan–Feb 2027 | **MVP web tryout**: 1 paket SKD, skor, pembahasan, leaderboard |
| Ebook | Mar–Apr 2027 | kuis harian bot, lencana & streak di web |
| Premium | Mei–Jul 2027 | tryout berbayar (paket dikunci), pembayaran |
| Musim seleksi | Agu–Okt 2027 | event tryout intensif, beban trafik puncak |

Pendaftaran sekolah kedinasan biasanya dibuka sekitar Agustus lewat SSCASN BKN; SKD sesudahnya. Trafik akan memuncak di Juli–Oktober.

---

## 2. Format ujian yang disimulasikan (SKD)

Dasar aturan terakhir yang dipakai (seleksi 2026). **Cek ulang tiap tahun** dari pengumuman resmi; buat semua angka ini sebagai konfigurasi, bukan hard-code.

| Subtes | Jumlah soal | Penilaian |
| --- | --- | --- |
| TWK (Tes Wawasan Kebangsaan) | 30 | benar = 5, salah/kosong = 0 |
| TIU (Tes Intelegensia Umum) | 35 | benar = 5, salah/kosong = 0 |
| TKP (Tes Karakteristik Pribadi) | 45 | tiap opsi bernilai 1–5, tidak ada nilai 0 |
| **Total** | **110 soal** | durasi **100 menit** |

- Materi TWK: nasionalisme, integritas, bela negara, pilar negara (Pancasila, UUD 1945, NKRI, Bhinneka Tunggal Ika), bahasa negara.
- Materi TIU: verbal (analogi, silogisme), numerik (deret, soal cerita, hitung cepat), figural (pola gambar).
- Materi TKP: pelayanan publik, jejaring kerja, sosial budaya, teknologi informasi, profesionalisme, dll.
- Ambang batas (passing grade) per subtes **berbeda antar sumber/tahun** → simpan sebagai konfigurasi dan tampilkan "aman / belum aman" hanya jika nilainya sudah dikonfirmasi dari aturan resmi.
- Tampilan ujian sebaiknya mirip CAT BKN: nomor soal di panel, tandai ragu-ragu, pindah soal bebas, timer berjalan, tombol selesai dengan konfirmasi.

---

## 3. Web tryout — kebutuhan

### MVP (wajib di peluncuran pertama)
1. **Akun**: daftar/masuk (email + password, atau login Google). Simpan **nama panggilan** (tampil di leaderboard), kota, sekolah tujuan (pilihan). Centang persetujuan kebijakan privasi saat daftar.
2. **Tryout SKD**: 110 soal, timer 100 menit, navigasi nomor, tandai ragu, simpan jawaban otomatis (tahan refresh/koneksi putus).
3. **Hasil**: skor TWK/TIU/TKP + total, langsung setelah selesai; waktu pengerjaan.
4. **Pembahasan** tiap soal setelah tryout selesai.
5. **Leaderboard**: per event tryout dan mingguan; filter per sekolah tujuan; hanya nama panggilan + kota.
6. **Riwayat** tryout pengguna.
7. **Admin panel sederhana**: tambah/ubah soal (teks, gambar untuk soal figural, opsi, kunci/bobot, pembahasan, subtes, sub-materi, tingkat kesulitan), susun paket tryout, buat event (jadwal buka–tutup).
8. **Mobile-first**: sebagian besar pengguna memakai HP murah dan koneksi tidak stabil.

### Fitur "seru" (tahap 2)
- Event tryout mingguan serentak (jam mulai sama), hasil diumumkan ke Telegram.
- Lencana & streak ("7 hari latihan beruntun", "TKP di atas rata-rata").
- Mini kuis harian 5 soal / 5 menit.
- Grafik perkembangan nilai pribadi.
- **Kartu hasil** (gambar 1080×1920) yang bisa dibagikan ke story Instagram/TikTok — berisi skor, nama panggilan, branding.
- Analisis kelemahan per sub-materi.

### Anti-curang (penting untuk leaderboard)
- Acak urutan soal dan urutan opsi per pengguna.
- Hanya **percobaan pertama** di sebuah event yang masuk leaderboard.
- Timer dicatat di server, bukan hanya di browser.
- Tandai skor janggal (mis. selesai jauh terlalu cepat) untuk ditinjau admin.
- Kunci jawaban tidak pernah dikirim ke browser sebelum tryout selesai.

### Tahap premium (Mei 2027)
- Paket tryout berbayar (dikunci per pengguna setelah bayar).
- Pembayaran lewat payment gateway resmi Indonesia (QRIS/VA/e-wallet) atau tautan lynk.id; webhook untuk membuka akses otomatis.
- Kode voucher/bundling (ebook + paket tryout).
- Kebijakan refund tertulis.

---

## 4. Bot Telegram — kebutuhan

Struktur: **1 channel** (pengumuman satu arah) + **1 grup diskusi** yang terhubung. Bot jadi admin di grup.

| Fitur | Perilaku |
| --- | --- |
| **Sapaan anggota baru** | Saat ada yang join: pesan selamat datang yang menyebut namanya + aturan singkat + link tryout. Wajib klik tombol verifikasi ("Saya bukan bot") dalam X menit; jika tidak, dikeluarkan otomatis. Hapus pesan sapaan lama agar grup tidak penuh. |
| **Anti-spam** | Hapus otomatis: link luar (kecuali domain yang di-whitelist, mis. web tryout & sscasn.bkn.go.id), undangan grup lain, promosi/jualan, kata terlarang, pesan berulang (flood). Sistem peringatan: peringatan 1 → peringatan 2 → dibisukan sementara (mis. 24 jam) → admin memutuskan kick. Semua tindakan dicatat; admin bisa membatalkan (`/unwarn`, `/unmute`). Anggota baru (mis. < 24 jam) tidak boleh kirim link/media. |
| **Info terjadwal** | Pengingat event tryout, jadwal seleksi, pengumuman video baru, posting di jam tertentu. |
| **Perintah** | `/tryout` (link web), `/jadwal` (jadwal seleksi & event), `/materi` (daftar materi SKD), `/aturan`, `/peringkat` (10 besar event terakhir dari web). |
| **Kuis harian** | Kirim soal memakai fitur **kuis bawaan Telegram** (poll tipe quiz) dari bank soal yang sama, dengan pembahasan singkat. |
| **Hasil tryout** | Mengumumkan 10 besar leaderboard tiap event (ambil dari API web). |
| **Peringatan anti-penipuan** | Pesan rutin: "Admin tidak pernah meminta transfer lewat chat pribadi." |

Catatan:
- Bot **tidak menggantikan admin manusia**; tetap ada 1–2 moderator.
- Semua teks bot berbahasa Indonesia santai-sopan, gaya "kakak tingkat".
- Butuh fitur admin untuk mengubah daftar kata terlarang & whitelist domain tanpa deploy ulang.

---

## 5. Integrasi web ↔ bot

- Bank soal & leaderboard berada di backend web; bot membaca lewat API (endpoint terlindungi token).
- Opsional tahap 2: hubungkan akun Telegram ke akun web (login dengan Telegram) agar lencana/streak tersinkron.

---

## 6. Identitas visual

Gaya: **notebook / kolase ilustratif**, hangat, ramai visual (ikon, stiker, coretan tangan), bukan desain minimalis polos. Harus terasa seru seperti game, tapi tetap rapi dibaca.

Palet "Cokelat Bhayangkara":

| Nama | Hex | Pemakaian |
| --- | --- | --- |
| BG | `#EFE7D6` | latar (kertas krem) |
| GRID | `#E1D5BC` | garis grid tipis di latar |
| INK | `#2B2118` | teks utama, garis tepi tebal |
| CARD | `#FFFBF2` | kartu |
| BROWN | `#7A5230` | aksen utama, highlight kata |
| BROWN_D | `#5A3B20` | aksen gelap |
| GOLD | `#C9A13B` | lencana, tombol sekunder |
| GOLD_L | `#F4E4B5` | latar chip/stiker |
| GOLD_B | `#DCC27E` | border emas |
| RED | `#B8322A` | stempel "PENTING", peringatan |
| MUTED | `#857A6A` | teks sekunder |

- Font: **Poppins** (judul & teks, tebal 700–800) dan **Space Mono** (label kecil/teknis).
- Ciri khas: kartu dengan garis tepi tinta tebal + bayangan tegas (offset, tidak blur), sudut membulat, stiker miring, stempel merah, garis bawah bergelombang.
- **Maskot**: kartun wajah pemilik dengan topi pet polisi dan **lencana bintang generik** (pemilik akan mengirim file PNG ekspresi: senyum, ketawa, kaget, mikir, tegas, kedip, sedih, hormat). Pakai untuk halaman hasil (ekspresi sesuai skor), kosong, error, dll.

---

## 7. Aturan main (wajib dipatuhi)

1. **Jangan memakai logo resmi Polri, lambang Tribrata, atau logo instansi/sekolah mana pun.** Akun ini akun pribadi. Tulis jelas di footer: "Akun pribadi edukasi, bukan kanal resmi instansi mana pun."
2. **Tidak ada klaim** "dijamin lulus", "bocoran", "soal asli". Gunakan "latihan yang mirip format CAT".
3. **Soal harus orisinal** (boleh dibantu AI, dicek manual); jangan menyalin dari buku/bimbel lain.
4. **Perlindungan data pribadi (UU PDP):** kumpulkan data seminimal mungkin, password di-hash, leaderboard hanya nama panggilan, ada halaman kebijakan privasi, pengguna bisa menghapus akunnya, data tidak dijual/dibagikan.
5. **Jangan menyimpan API key/token di kode atau repo** — pakai environment variables/secret manager.
6. Semua angka aturan ujian (jumlah soal, durasi, bobot, ambang batas) adalah **konfigurasi** yang bisa diubah admin.

---

## 8. Rekomendasi teknis (boleh disesuaikan)

- Pemilik paham IT; utamakan stack yang **murah dirawat sendiri** dan gratis/murah di awal.
- Web: framework modern (mis. Next.js) + database relasional (mis. PostgreSQL/Supabase) + autentikasi bawaan.
- Bot: library Telegram yang matang (mis. python-telegram-bot / aiogram, atau grammY untuk Node), mode webhook, di-hosting di layanan yang sama atau serverless.
- Siapkan untuk lonjakan trafik saat event serentak (cache leaderboard, simpan jawaban secara efisien).
- Analitik dasar: jumlah akun baru, tryout selesai, rata-rata skor per subtes, sumber pengunjung (UTM dari link bio).

### Model data minimum (gambaran)
- `users` (id, nama_panggilan, email, kota, sekolah_tujuan, telegram_id?, consent_at)
- `questions` (id, subtes: TWK/TIU/TKP, sub_materi, teks, gambar?, tingkat, pembahasan, status draft/terbit)
- `options` (id, question_id, teks, is_correct untuk TWK/TIU, bobot 1–5 untuk TKP)
- `packages` (id, nama, gratis/berbayar, daftar soal atau aturan pengacakan)
- `events` (id, package_id, buka, tutup)
- `attempts` (id, user_id, package_id, event_id?, mulai, selesai, skor_twk, skor_tiu, skor_tkp, total, flag_janggal)
- `answers` (attempt_id, question_id, option_id, ragu, waktu)
- `badges`, `user_badges`, `purchases` (tahap 2–3)
- Bot: `warnings` (telegram_user_id, alasan, oleh, waktu), `settings` (kata terlarang, whitelist domain)

---

## 9. Urutan pengerjaan yang disarankan

1. **Bot Telegram dasar** (sapaan + verifikasi, anti-spam + peringatan, `/aturan` `/tryout`) — bisa dipakai segera.
2. **Admin bank soal** + format impor soal (mis. CSV/JSON) agar pemilik bisa mengisi soal sambil web dibangun.
3. **Web tryout MVP** (akun, tryout, skor, pembahasan, leaderboard).
4. Integrasi bot ↔ web (peringkat, pengingat event, kuis harian dari bank soal).
5. Fitur seru (lencana, streak, kartu hasil untuk story).
6. Pembayaran & paket premium.

## 10. Keputusan yang masih terbuka (tanyakan ke pemilik)
- Nama domain web.
- Siapa 1–2 admin grup.
- Hosting & anggaran bulanan yang disanggupi.
- Harga paket premium (setelah riset pesaing).
- Target jumlah soal sebelum peluncuran web.
