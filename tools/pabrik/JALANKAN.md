# Pabrik video Catatan Abdi Negara: prosedur kerja harian

Dokumen ini dibaca oleh tugas terjadwal (Claude) setiap jam 10.00 WIB. Tugas ini juga bisa dijalankan manual.
Semua langkah memakai bahasa Indonesia. Hasil akhir dikirim ke Mac pemilik di `~/Movies/siap-upload/`.

## 0. Aturan yang tidak boleh dilanggar

- **Naskah wajib disetujui pemilik** sebelum dibuat suara dan video. Tanda setujunya: status di sheet = `Naskah OK`.
- **Jangan pernah membaca, menampilkan, atau meminta** API key ElevenLabs. Key itu hanya ada di Mac (`~/Movies/pabrik-konten/elevenlabs-api-key.txt`) dan dipakai oleh worker di Mac.
- **Jangan upload ke media sosial.** Pemilik upload sendiri.
- **Konten:**
  - Tidak boleh ada klaim "dijamin lulus", "bocoran", atau "soal asli".
  - Tidak boleh menggambar ulang logo atau lambang resmi instansi. Foto boleh dipakai bila diberikan pemilik, dengan kredit.
- **Fakta yang bisa berubah** (formasi, jadwal, syarat) wajib dicek lewat web search dari sumber resmi atau berita tepercaya. Di caption, cantumkan ajakan untuk cek ulang di situs resmi.
- **Pengucapan:** STIS dibaca "Stis" (tulis `Stis` di `ucapan`, `STIS` di `narasi`).
- **Kuis di akhir video tidak dijawab narator.** Pakai mode komentar: tanpa `jawab`, dengan `"kunci_kata": "komentar"`.

## 1. Pasang pabrik

```bash
git clone --depth 1 https://github.com/adivafiqri/catatanabdinegara /home/claude/catatanabdinegara   # bila belum ada
bash /home/claude/catatanabdinegara/tools/pabrik/pasang.sh
```

Perangkat (Mac) harus terhubung. Folder yang dipakai: `~/Movies` (berisi `pabrik-konten/antrian/` dan `siap-upload/`).

## 2. Baca rencana di sheet

- Sheet: artifact Sheets "Rencana 100 Video", `https://claude.ai/artifact/7Mz6C7ocqiQS7LTBEEfFWM`
  - container project `3384e3d8-7421-48de-848b-0494ed04edfe`, node `b6b486c2-833b`, engine `workbook`, sheet `Rencana 100 Video`
- Kolom: A = nomor Ep, B = judul, C = kategori, D = fase, E = isi, F = ajakan (CTA), G = status.
- Baris = nomor Ep − 3 (Ep28 ada di baris 25).
- Status: `Ide` → `Naskah` (menunggu dicek) → `Naskah OK` (disetujui pemilik) → `Suara` → `Render` → `Terupload`.

## 3. Urutan kerja setiap jalan

### Kantor harus "hidup" selama bekerja

Perbarui `apps/kantor/status.json` **di setiap pergantian tahap**, bukan hanya di akhir. Pemilik memantau kantor secara langsung di https://kantor.catatanabdinegara.site.

Cara memperbarui:
1. Ubah field karyawan yang bersangkutan (`status`, `tugas`, `bubble`, `hasil`, `update` dalam waktu WIB ISO) dan tambahkan satu notifikasi `{"dari", "teks", "waktu", "dibaca": false}`.
2. Jalankan `git pull --rebase origin main`, lalu commit dengan pesan pendek (`kantor: <siapa> <apa>`) dan push ke `main`.

Situs ter-deploy sendiri dalam sekitar 1 menit. Jangan menunggu deploy selesai, langsung lanjutkan pekerjaan.

| Saat | Ubah status.json |
| --- | --- |
| Mulai jalan | `rena` = `kerja` ("Cek rencana hari ini"), `boss` tetap, notifikasi "mulai shift harian" |
| Riset dan tulis naskah (B) | `nasa` = `kerja` ("Naskah Ep<A>–<B>"); `rena` = `selesai` |
| Naskah selesai dan dikirim untuk dicek | `nasa` = `selesai` (hasil: tautan dokumen); `rena` = `tunggu` ("Menunggu Boss cek naskah") |
| Menunggu suara (A.3–A.4) | `suara` (Vico) = `kerja` ("Suara Ep…") |
| Render (A.5) | `suara` = `selesai`; `edo` = `kerja` ("Render Ep… x/5"), perbarui hitungan setiap satu episode selesai |
| Periksa hasil (A.6) | `qiqi` = `kerja`; `edo` = `selesai` setelah semua episode ter-render |
| Kirim ke Mac (A.7) | `qiqi` = `selesai`; `sosi` tetap `blokir` ("Upload manual oleh Boss") kecuali ada koneksi Instagram |
| Ada kendala (Mac mati, build gagal, dan sebagainya) | karyawan terkait = `blokir`, `bubble` berisi masalahnya |
| Selesai semua | `kantor.video_selesai` dan `kantor.episode_berikut` diperbarui, karyawan tanpa kerjaan = `selesai` |

Karyawan berstatus `selesai` otomatis ke ruang istirahat; `kerja` dan `blokir` duduk di meja; `tunggu` berjalan keliling kantor.


### A. Buat video untuk naskah yang sudah disetujui (`Naskah OK`)

Untuk setiap episode berstatus `Naskah OK`, urut dari nomor Ep terkecil:

1. **Ambil naskah.** File ada di `tools/pabrik/root/pabrik/naskah/<key>/naskah.json` (key contoh: `28-senior-junior`).
2. **Sinkronkan revisi pemilik.** Buka dokumen naskah batch itu; tautannya ada di `tools/pabrik/batch.json`. Kalau teks Narasi atau Visual di tabel berbeda dari `naskah.json`, ikuti versi dokumen.
   - Perbarui `narasi` dan `ucapan`. Tag emosi seperti `[curious]`, `[excited]`, dan `[serious]` boleh dipertahankan.
   - Cek kecocokan kata: kata-kata di `ucapan` (tanpa tag) harus sama dengan `narasi`. Pengecualiannya hanya ejaan pengucapan seperti "Stis".
3. **Kirim ke antrean suara.** Tulis ke `/mnt/user-data/outputs/antrian/<key>-naskah.json`, lalu commit ke `~/Movies/pabrik-konten/antrian/<key>/naskah.json`.
   - Worker di Mac menghasilkan `suara-elevenlabs/narasi-utuh.mp3` dan `narasi-utuh-waktu.json`, kira-kira satu episode per menit.
   - Worker **melewati folder yang sudah pernah diproses**. Jadi untuk menyuarakan ulang, pakai nama folder baru, misalnya `<key>-v2`.
4. **Ubah status di sheet menjadi `Suara`.** Tunggu sampai kedua file suara ada (cek dengan `device_bash`, beri jeda), lalu stage keduanya ke `/home/claude/pabrik/naskah/<key>/suara-elevenlabs/`.
5. **Render.** Jalankan `cd /home/claude/pabrik && python3 pabrik.py naskah/<key> out/<key>`, lalu hapus file perantara dengan `rm -f out/<key>/video.mp4 out/<key>/narasi-padat.wav`.
6. **Periksa hasil** dengan contact sheet: `ffmpeg -i out/<key>/<key>.mp4 -vf "fps=0.75,scale=270:-1,tile=8x5" -frames:v 1 cek.png`. Lihat gambarnya. Pastikan:
   - teks muncul bersamaan dengan suara (tidak telat atau terlalu awal);
   - tidak ada teks terpotong atau tertimpa;
   - kata yang disorot benar-benar menyala;
   - sampul tidak bertumpuk (baris `atas` maksimal ±16 karakter).
   Perbaiki naskah atau kode bila perlu, lalu render ulang.
7. **Kirim ke Mac.** Salin hasil ke `/mnt/user-data/outputs/siap-upload/` dengan nama:
   - `ep<NN>-<slug>.mp4`
   - `sampul-ep<NN>-<slug>.png`
   - `caption-ep<A>-<B>.txt` (format sama dengan caption sebelumnya: hook, poin, catatan cek ulang, ajakan komentar, hashtag termasuk `#catatanabdinegara #fyp`)
   
   Lalu commit ke `~/Movies/siap-upload/`. Untuk menimpa file lama, pakai nama staging yang baru. Cek mtime di Mac setelah commit. Ukuran file di Mac biasanya 5.875 byte lebih besar karena metadata transfer, dan itu normal.
8. **Ubah status di sheet menjadi `Render`.**

### B. Tulis naskah 5 episode berikutnya

- Lewati langkah ini kalau masih ada **5 atau lebih** episode berstatus `Naskah` (belum dicek pemilik). Cukup ingatkan pemilik.
- Selain itu, ambil 5 episode berstatus `Ide` dengan nomor terkecil.

1. **Riset fakta** setiap episode: web search, buka sumbernya, catat tautannya.
2. **Tulis `naskah.json`** per episode di `tools/pabrik/root/pabrik/naskah/<key>/` dengan format di bagian 4. Biasanya 9–10 adegan, dengan jenis adegan yang bervariasi. Ajakan di akhir (CTA) menyebut episode berikutnya sesuai sheet.
3. **Buat dokumen naskah untuk dicek** (Claude Docs) berjudul `Naskah Ep<A>–<B> — Catatan Abdi Negara`, dengan susunan seperti dokumen "Naskah Ep23–27":
   - bagian "Cara review";
   - per episode: baris sampul, lalu tabel `# | Adegan | Visual | Narasi`;
   - bagian "Sumber".
4. **Catat batch di `tools/pabrik/batch.json`** (nomor Ep → URL dokumen), commit dan push ke `main`, lalu ubah status di sheet menjadi `Naskah`.

### C. Rapikan kantor dan kabari pemilik

- Ubah `apps/kantor/status.json`, lalu push ke `main`; situs ter-deploy sendiri.
  - Karyawan yang bekerja berstatus `kerja`. Yang selesai berstatus `selesai` dengan `hasil` diisi.
  - Rena berstatus `tunggu` kalau ada naskah yang menunggu dicek.
  - Tambahkan notifikasi baru dengan `"dibaca": false`.
  - ID karyawan: `nasa` = naskah, `suara` = Vico, `edo` = render, `qiqi` = QC, `desi` = feed, `sosi` = sosmed, `rena` = perencana.
- Kirim ringkasan ke pemilik (SendUserMessage atau PushNotification):
  - video yang selesai (nama file);
  - tautan dokumen naskah baru yang perlu dicek;
  - cara menyetujui: ubah status di sheet menjadi `Naskah OK`;
  - perkiraan karakter ElevenLabs yang terpakai.

## 4. Format naskah.json

```json
{"judul": "Ep 28 — ...", "sampul": {"ep": "EP 28", "atas": ["maks 16 huruf"], "hl": "teks sorot", "bawah": ["baris", "baris"], "stiker": "SAVE!", "maskot": "senyum"},
 "adegan": [{"id": 1, "tipe": "hook", "durasi": 3.0, "maskot": "kaget", "narasi": "...", "ucapan": "[curious] ...", "...": "field per tipe"}]}
```

- `maskot` hanya boleh: `senyum`, `hormat`, `kaget`, `mikir`, `tegas`.
- Field per tipe adegan:
  - `hook {stiker, teks:[..], hl}`
  - `kata {hl:[kata tanpa tanda baca]}`
  - `vs {kiri:{judul,item:[..]}, kanan:{judul,item:[..]}}`
  - `chat {item:[["kiri"|"kanan", teks]], wajah}`
  - `steps {judul, item:[..]}`
  - `checks {label, item:[..]}`
  - `chips {judul, item:[[nama, ket]]}`
  - `big {label, angka, sub}`
  - `card {label, ikon, baris:[..], sub:[..]}`. Ikon diambil dari `aset-kedinasan/png`, misalnya `19-ikon-gedung-kampus`, `16-ikon-kalender`, `20-ikon-jam`.
  - `stamp {teks:[..], hl}`
  - `ilustrasi {ilus, judul}`. Pilihan `ilus`: statistik, keuangan, pemerintahan, siber, cuaca, transportasi, kampus, peta, stan, kontrak, cukur, layanan, makan.
  - `foto {foto, kredit, judul}`
  - `jadwal {label, item:[[waktu, teks]]}`
  - `skala {opsi:[[teks, skor]]}`
  - `pohon {akar, anak}`
  - `kuis {label, soal, opsi:[4], kunci_kata: "komentar"}`
  - `cta {judul: "next: ...", label: "episode N", baris:[2], stiker: "FOLLOW!", maskot: "hormat"}`
- Kata yang disorot (`hl`) harus muncul persis dalam narasi. Untuk adegan `kata`, tulis tanpa tanda baca.
- Judul kartu VS yang tidak diucapkan akan otomatis muncul bersama butir pertamanya.
- Angka di layar boleh berupa digit; di narasi, tulis dengan huruf bila perlu diucapkan jelas.
