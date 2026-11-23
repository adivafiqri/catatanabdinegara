# PRD — Web Tryout & Bot Telegram "Catatan Abdi Negara"

Versi 0.1 · 23 November 2026 · Status: **draf, menunggu persetujuan pemilik**
Sumber: `BRIEF-web-tryout-dan-bot-telegram.md`

---

## 1. Tujuan

| Tujuan | Ukuran keberhasilan (tebakan awal, perlu disetujui) |
| --- | --- |
| Membuktikan manfaat brand lewat tryout gratis yang terasa seperti ujian sungguhan | ≥ 60% akun baru menyelesaikan minimal 1 tryout dalam 7 hari |
| Mengumpulkan akun yang bisa dihubungi lagi (dengan izin) | 3.000 akun sebelum Juli 2027 |
| Menjaga grup Telegram tetap bersih & ramai | < 1% pesan spam lolos lebih dari 5 menit; 1–2 moderator cukup |
| Menyiapkan jalur ke produk berbayar | Paket premium bisa dibuka otomatis setelah bayar (Mei 2027) |
| Tahan beban event serentak | 2.000 peserta bersamaan tanpa jawaban hilang (lihat ARSITEKTUR.md §6) |

**Bukan tujuan:** menjadi kanal resmi instansi, menjamin kelulusan, menyediakan "bocoran"/soal asli.

## 2. Pengguna

| Persona | Kebutuhan utama | Perangkat |
| --- | --- | --- |
| **Siswa** kelas 11–12 / lulusan 1–2 tahun (banyak di bawah 18 tahun) | Latihan mirip CAT, tahu skor & kelemahan, bersaing dengan teman | HP Android murah, kuota terbatas, sinyal putus-sambung |
| **Orang tua** | Yakin produk aman & bermanfaat sebelum membeli | HP |
| **Pelamar CPNS** (nanti) | Format SKD yang sama | HP / laptop |
| **Admin konten** (pemilik) | Mengisi & menerbitkan soal, menyusun paket & event | Laptop |
| **Moderator grup** (1–2 orang) | Menindak spam, membatalkan tindakan bot yang keliru | HP (Telegram) |

> ⚠️ Banyak pengguna berusia **di bawah 18 tahun**. UU PDP (UU 27/2022 Pasal 25) mewajibkan **persetujuan orang tua/wali** untuk memproses data anak. Lihat KEAMANAN.md §3.3 — ini memengaruhi alur daftar MVP.

## 3. Ruang lingkup per tahap

Legenda: **M** = MVP · **T2** = tahap 2 · **P** = premium

### 3.1 Bot Telegram

| # | Fitur | Tahap | Kriteria "selesai" |
| --- | --- | --- | --- |
| B1 | Sapaan anggota baru + tombol verifikasi | M (Milestone 1) | Anggota baru dibisukan sampai klik "Saya bukan bot"; tidak klik dalam X menit (konfigurasi, default 5) → dikeluarkan; pesan sapaan sebelumnya dihapus sehingga paling banyak 1 sapaan tampil; bot dimulai ulang di tengah masa tunggu tetap menindak sesuai jadwal |
| B2 | Anti-spam | M (M1) | Pesan berisi link non-whitelist, undangan grup, kata terlarang, atau flood (≥ N pesan dalam T detik, konfigurasi) dihapus ≤ 3 detik; admin & moderator dikecualikan; anggota < 24 jam tidak bisa kirim link/media |
| B3 | Sistem peringatan | M (M1) | Peringatan 1 → 2 → bisu 24 jam → notifikasi ke moderator untuk keputusan kick; `/unwarn` & `/unmute` hanya untuk moderator; semua tindakan tercatat di `bot_actions` |
| B4 | Perintah dasar `/aturan` `/tryout` `/materi` | M (M1) | Balasan dalam bahasa "kakak tingkat"; teks bisa diubah admin tanpa deploy |
| B5 | Admin pengaturan bot (kata terlarang, whitelist domain, teks) | M (M1 lewat perintah bot; M2 lewat panel web) | Perubahan berlaku ≤ 60 detik tanpa deploy |
| B6 | Pesan rutin anti-penipuan & info terjadwal | M (M1) | Pesan terjadwal terkirim di jam yang diatur (WIB), tidak dobel bila bot restart |
| B7 | `/jadwal` | M (M1) | Menampilkan jadwal seleksi & event dari data yang diisi admin; jadwal resmi diberi label "cek ulang di sumber resmi" |
| B8 | `/peringkat` & pengumuman 10 besar event | T2 (M4) | Mengambil dari API web bertoken; hanya nama panggilan + kota |
| B9 | Kuis harian (poll tipe quiz Telegram) | T2 (M4) | 1 soal/hari dari bank soal bertanda "boleh untuk kuis", pembahasan ≤ 200 karakter (batas Telegram), tidak mengulang soal dalam 60 hari |
| B10 | Login dengan Telegram (tautkan akun) | T2 | Pengguna bisa menautkan & memutus tautan sendiri |

### 3.2 Admin bank soal

| # | Fitur | Tahap | Kriteria "selesai" |
| --- | --- | --- | --- |
| A1 | CRUD soal (teks, gambar figural, opsi A–E, kunci/bobot, pembahasan, subtes, sub-materi, tingkat) | M (M2) | Validasi: TWK/TIU tepat 1 kunci; TKP semua opsi berbobot 1–5 dan unik; pratinjau tampilan seperti di ujian |
| A2 | Alur status soal: draf → ditinjau → terbit → diarsipkan | M (M2) | Hanya soal "terbit" bisa masuk paket; soal yang sudah dipakai di attempt tidak bisa dihapus, hanya diarsipkan |
| A3 | Impor CSV/JSON | M (M2) | File contoh tersedia; impor memvalidasi semua baris dulu, menampilkan laporan error per baris, dan tidak menyimpan apa pun bila ada error (all-or-nothing); 500 soal ≤ 30 detik |
| A4 | Ekspor bank soal (JSON) | M (M2) | Untuk cadangan & bahan ebook |
| A5 | Konfigurasi aturan SKD (jumlah soal, durasi, bobot, ambang batas) | M (M2) | Bisa membuat versi aturan baru; attempt lama tetap dinilai dengan versi aturan saat dikerjakan |
| A6 | Susun paket (pilih manual / acak per kuota sub-materi) | M (M3) | Paket tidak bisa diterbitkan bila jumlah soal per subtes ≠ aturan |
| A7 | Buat event (jadwal buka–tutup) | M (M3) | Event di luar jadwal tidak bisa dimulai; jam dalam WIB |
| A8 | Tinjau skor janggal | M (M3) | Daftar attempt bertanda janggal; admin bisa "sahkan" atau "keluarkan dari leaderboard" dengan alasan |
| A9 | Statistik soal (persentase benar, opsi paling dipilih) | T2 | Untuk memperbaiki soal yang bermasalah |

### 3.3 Web tryout

| # | Fitur | Tahap | Kriteria "selesai" |
| --- | --- | --- | --- |
| W1 | Daftar/masuk email+password & Google | M (M3) | Verifikasi email; reset password; persetujuan kebijakan privasi tercatat (`consent_at`, versi kebijakan); alur persetujuan wali untuk < 18 tahun (lihat KEAMANAN.md) |
| W2 | Profil: nama panggilan, kota, sekolah tujuan | M (M3) | Nama panggilan unik, 3–20 karakter, disaring kata kasar; bisa diubah maksimal 1×/30 hari (mencegah penyamaran di leaderboard) |
| W3 | Tryout SKD | M (M3) | 110 soal / 100 menit (dari konfigurasi); navigasi nomor; tandai ragu; urutan soal & opsi diacak per attempt; jawaban tersimpan otomatis dan kembali utuh setelah refresh/tutup tab/koneksi putus; timer dari server; waktu habis → otomatis dikumpulkan |
| W4 | Mode hemat kuota | M (M3) | Halaman ujian < 150 KB transfer awal (tanpa gambar soal); gambar soal dimuat bertahap |
| W5 | Hasil | M (M3) | Skor TWK/TIU/TKP + total + durasi tampil ≤ 3 detik setelah selesai; status "aman/belum aman" **hanya** jika ambang batas di konfigurasi bertanda "terverifikasi" |
| W6 | Pembahasan | M (M3) | Hanya bisa dibuka setelah attempt selesai; menampilkan jawaban pengguna, kunci/bobot, pembahasan |
| W7 | Leaderboard per event & mingguan | M (M3) | Hanya percobaan pertama di event; filter sekolah tujuan; menampilkan nama panggilan + kota; peringkat pengguna sendiri tampil walau di luar 100 besar; diperbarui ≤ 60 detik |
| W8 | Riwayat tryout | M (M3) | Daftar attempt dengan skor & tautan pembahasan |
| W9 | Hapus akun & unduh data sendiri | M (M3) | Hapus akun menghapus data pribadi dalam 30 hari, skor leaderboard dianonimkan ("Peserta terhapus") |
| W10 | Halaman kebijakan privasi, syarat, disclaimer | M (M3) | Footer: "Akun pribadi edukasi, bukan kanal resmi instansi mana pun." |
| W11 | Analitik dasar (akun baru, tryout selesai, rata-rata per subtes, UTM) | M (M3) | Dasbor admin sederhana; tanpa pelacak pihak ketiga yang menjual data |
| W12 | Event mingguan serentak + umumkan ke Telegram | T2 (M4) | |
| W13 | Lencana & streak | T2 (M5) | |
| W14 | Mini kuis harian 5 soal / 5 menit | T2 (M5) | |
| W15 | Grafik perkembangan nilai | T2 (M5) | |
| W16 | Kartu hasil 1080×1920 untuk story | T2 (M5) | Dibuat di server, tanpa data pribadi selain nama panggilan |
| W17 | Analisis kelemahan per sub-materi | T2 (M5) | |
| W18 | Paket berbayar, pembayaran, webhook, voucher, kebijakan refund | P (M6) | Akses terbuka otomatis ≤ 1 menit setelah pembayaran sukses; webhook idempoten & terverifikasi tanda tangan |

## 4. Kriteria lintas-fitur (berlaku untuk semua milestone)

- Semua teks antarmuka bahasa Indonesia, nada "kakak tingkat": santai, sopan, jelas.
- Tidak ada logo instansi; tidak ada klaim "dijamin lulus/bocoran/soal asli".
- Lighthouse mobile (profil HP menengah, 4G lambat): Performance ≥ 85, Accessibility ≥ 95 untuk beranda & halaman ujian.
- Tes otomatis lulus; code review & security review (agent ECC) tanpa temuan kritis terbuka.
- Tidak ada secret di repo (dicek otomatis di CI).

## 5. Asumsi & pertanyaan terbuka

Lihat daftar di ringkasan Tahap 0 dan RENCANA-KERJA.md §6.
