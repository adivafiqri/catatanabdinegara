# Panduan Mengisi Bank Soal

Target peluncuran web: **1 paket SKD penuh = 110 soal**, terdiri dari **30 TWK + 35 TIU + 45 TKP**.

Soal diisi di Google Sheets, diunduh sebagai CSV, lalu dicek dengan `pnpm soal:cek`. Setelah panel admin web jadi (Milestone 2 bagian B), file yang sama bisa langsung diimpor.

---

## 1. Siapkan spreadsheet
1. Buka Google Sheets → **File → Impor** → unggah `docs/templat/templat-soal.csv` (pilih "Ganti spreadsheet").
2. Baris 1 adalah judul kolom. **Jangan diubah atau diurutkan ulang.**
3. Baris 2–4 berisi contoh TWK, TIU, dan TKP. Boleh dihapus setelah paham polanya.
4. Satu baris = satu soal.

## 2. Arti tiap kolom

| Kolom | Isi | Contoh |
| --- | --- | --- |
| `code` | Kode unik: `SUBTES-KELOMPOK-NOMOR`. Awalan harus sama dengan subtes. Kode **tidak boleh diganti** setelah diimpor, karena kode itulah yang menandai soal yang sama saat diimpor ulang. | `TIU-DRT-0001` |
| `subtes` | `TWK`, `TIU`, atau `TKP` | `TIU` |
| `sub_materi` | Salah satu dari daftar di §3 | `tiu-deret-angka` |
| `tingkat` | `1` mudah, `2` sedang, `3` sulit | `2` |
| `soal` | Teks soal. Boleh pindah baris di dalam sel (Ctrl+Enter). | |
| `gambar` | Nama file gambar untuk soal figural (kosongkan jika tidak ada). Format `.webp`/`.png`/`.jpg`. | `TIU-FIG-0001.webp` |
| `opsi_a` … `opsi_e` | 5 pilihan jawaban, semuanya wajib diisi dan tidak boleh ada yang sama persis | |
| `kunci` | **TWK/TIU:** huruf jawaban benar `A`–`E`. **TKP:** kosongkan. | `C` |
| `bobot` | **TKP:** 5 angka 1–5 dipisah `\|` sesuai urutan A–E, tiap angka dipakai sekali. **TWK/TIU:** kosongkan. | `2\|5\|1\|3\|4` |
| `pembahasan` | Penjelasan jawaban. Boleh kosong saat draf, tetapi **wajib** sebelum soal diterbitkan. | |
| `pembahasan_kuis` | Ringkasan ≤ 200 karakter untuk kuis harian Telegram | |
| `boleh_kuis` | `ya` / `tidak`. Hanya untuk TWK/TIU tanpa gambar, dengan soal ≤ 300 karakter dan tiap opsi ≤ 100 karakter (batas Telegram). | `ya` |
| `sumber` | Asal soal, wajib diisi. Contoh: `orisinal`, atau `dibantu AI, dicek manual oleh <nama>`. | `orisinal` |

### Kelompok kode yang disarankan
| Subtes | Kelompok | Sub-materi |
| --- | --- | --- |
| TWK | `NAS` `INT` `BEL` `PCS` `UUD` `NKR` `BTI` `BHS` | nasionalisme, integritas, bela negara, Pancasila, UUD 1945, NKRI, Bhinneka, bahasa negara |
| TIU | `ANL` `SIL` `DRT` `CRT` `HTG` `FIG` | analogi, silogisme, deret, soal cerita, hitung cepat, figural |
| TKP | `PLY` `JEJ` `SOS` `TIK` `PRO` | pelayanan publik, jejaring kerja, sosial budaya, teknologi informasi, profesionalisme |

## 3. Daftar `sub_materi`
```
twk-nasionalisme  twk-integritas  twk-bela-negara  twk-pancasila  twk-uud-1945
twk-nkri  twk-bhinneka-tunggal-ika  twk-bahasa-negara
tiu-analogi  tiu-silogisme  tiu-deret-angka  tiu-soal-cerita  tiu-hitung-cepat  tiu-figural
tkp-pelayanan-publik  tkp-jejaring-kerja  tkp-sosial-budaya  tkp-teknologi-informasi  tkp-profesionalisme
```
Perlu sub-materi baru? Kabari saya. Nanti bisa ditambah lewat panel admin.

## 4. Unduh & cek
1. Google Sheets → **File → Download → Comma-separated values (.csv)**.
2. Salin ke VPS (mis. `~/soal/batch-1.csv`), lalu jalankan:
   ```bash
   cd ~/catatanabdinegara
   pnpm soal:cek ~/soal/batch-1.csv
   # soal figural: taruh gambar di satu folder, lalu
   pnpm soal:cek ~/soal/batch-1.csv --gambar ~/soal/gambar
   ```
3. Arti hasilnya:
   - **ERROR**: harus diperbaiki. Nomor baris sama dengan nomor baris di spreadsheet.
   - **Peringatan**: boleh diimpor, tapi cek lagi (mis. pembahasan kosong, soal kembar, kata "bocoran").
   - **Kelengkapan**: berapa soal lagi yang kurang untuk 1 paket (30/35/45).

File `.csv` dari Excel yang memakai pemisah titik koma (`;`) juga diterima.

## 5. Aturan isi (dari brief)
- **Orisinal.** Boleh dibantu AI, tetapi dicek manual. Jangan menyalin dari buku atau bimbel lain.
- **Tidak ada** klaim "bocoran", "soal asli", atau "dijamin lulus". Validator akan memberi peringatan jika kata-kata ini muncul.
- **TKP:** tiap opsi punya nilai 1–5 dan tidak ada yang sama. Opsi terbaik = 5.
- Usahakan sebaran tingkat kesulitan wajar (mis. 30% mudah, 50% sedang, 20% sulit) dan semua sub-materi terwakili.

## 6. Alur status setelah diimpor
`draf` → `ditinjau` → `terbit` → (`arsip`)

- Hasil impor selalu berstatus **draf**.
- Hanya soal **terbit** yang bisa masuk paket tryout.
- Jika soal yang sudah terbit diimpor ulang dengan isi berubah: versi lama disimpan di riwayat, versinya naik, dan statusnya kembali menjadi draf untuk ditinjau ulang.
- Soal tidak pernah dihapus, hanya diarsipkan, agar riwayat tryout peserta tetap utuh.
