# Arah Desain

Versi 0.1 · 23 November 2026 · Mengikuti skill `frontend-design` (anthropics/skills)

Mockup statis: `docs/mockup/index.html` (buka di browser). Isinya 3 arah × 4 layar (beranda, ujian, hasil, leaderboard) dengan lebar 390px.
Pratinjau daring privat: https://claude.ai/artifact/EV4zre3YFz7obRVcLSZfeo

---

## 1. Pegangan bersama (berlaku di ketiga arah)

### Subjek
Buku catatan belajar seorang **kakak tingkat** yang dulu taruna. Kosakata visualnya diambil dari dunia itu: kertas petak/folio, map, tinta, stempel, stiker, dan coretan pinggir halaman. Kosakata ini yang membuat tampilan tidak bisa ditukar dengan produk lain. **Tanpa** logo, lambang, atau bentuk yang meniru atribut resmi instansi; satu-satunya "atribut" adalah maskot dengan lencana bintang generik.

### Palet Cokelat Bhayangkara (dari brief) + 2 tambahan fungsional
| Token | Hex | Catatan |
| --- | --- | --- |
| `--bg` | `#EFE7D6` | kertas |
| `--grid` | `#E1D5BC` | garis kertas |
| `--ink` | `#2B2118` | teks & tepi tebal |
| `--card` | `#FFFBF2` | kartu |
| `--brown` / `--brown-d` | `#7A5230` / `#5A3B20` | aksen / pita gelap |
| `--gold` / `--gold-l` / `--gold-b` | `#C9A13B` / `#F4E4B5` / `#DCC27E` | lencana, stiker, tepi emas |
| `--red` | `#B8322A` | **hanya** stempel & peringatan |
| `--muted` | `#857A6A` | dekorasi & teks ≥ 18px |
| **`--muted-text`** (baru) | `#6B604F` | teks sekunder kecil. `#857A6A` di atas krem kontrasnya hanya ± 3,3:1, di bawah syarat WCAG 4,5:1 untuk teks kecil |
| **`--ok`** (baru) | `#3F6B3A` | status "tersimpan"; hijau zaitun agar tidak bentrok dengan palet cokelat |

### Tipografi
- **Poppins** untuk teks isi (400/500) dan judul (700/800), sesuai brief.
- **Space Mono** untuk label teknis: timer, kode subtes, chip. Pemakaiannya dibatasi pada data yang memang "teknis" agar tidak jadi gaya default.
- Skala (px, HP): 12 · 13 · 15 (isi) · 17 (teks soal) · 20 · 24 · 31/40 (judul). Teks soal ujian minimal 17px dengan tinggi baris 1,6.
- Font di-*self-host* dalam produksi (lebih cepat, aman untuk CSP).
- **Usulan font karakter** (opsional, satu per arah):
  - **Kalam** (A, C): khusus coretan tangan pendek ≤ 1 kalimat. Alasan: brief meminta "coretan tangan", dan versi palsu dengan Poppins miring tidak terasa tulisan tangan.
  - **Archivo lebar sempit** (B): mirip label map/huruf cetak administrasi; padat sehingga judul panjang muat di HP.
  - **Bowlby One** (C): angka skor & judul yang tebal seperti stiker game; terbaca dari jauh di tangkapan layar TikTok.

### Bentuk
- Tepi tinta 2–2,5px, bayangan **offset tegas tanpa blur** (`4px 4px 0 var(--ink)`).
- Radius bertingkat sesuai peran: tombol/kartu 10–12px, chip 999px, stempel 4–6px. Tidak semua benda memakai radius yang sama.
- Kemiringan stiker antara −3° dan +2°, **maksimal 2 benda miring per layar**.
- Ikon berupa SVG garis 2,5px dengan ujung membulat (gaya yang sama dengan maskot). **Tidak ada emoji.**

### Halaman ujian: sama di semua arah, sengaja tenang
Peserta harus fokus 100 menit, dan tampilannya perlu mirip CAT BKN. Karena itu halaman ujian memakai latar polos `#F7F3EA`, kartu opsi berwarna putih dengan target sentuh ≥ 48px, dan tanpa stiker, coretan, maskot, atau animasi. Timer berupa angka mono yang selalu terlihat. Status "Tersimpan" kecil berwarna hijau. Panel nomor soal 10 kolom memakai legenda warna **dan** bentuk (garis tepi tebal untuk soal aktif) agar tetap terbaca oleh pengguna buta warna. Tombol "Selesai & kumpulkan" diberi warna merah garis (tidak penuh) dan selalu membuka konfirmasi.

### Maskot
| Situasi | Ekspresi |
| --- | --- |
| Beranda / sapaan | hormat, senyum |
| Hasil ≥ 75% dari skor maksimal | ketawa |
| Hasil 50–75% | senyum / kedip |
| Hasil < 50% | mikir (bukan sedih; tujuannya menyemangati) |
| Leaderboard | tegas |
| Halaman kosong ("belum ada riwayat") | kedip |
| Error / koneksi putus | kaget |
| Waktu habis | sedih (hanya di sini) |

### Bahasa antarmuka
Nada kakak tingkat: kalimat pendek, kata kerja jelas, menyapa dengan "kamu". Tombol menyebut tindakan sebenarnya ("Mulai tryout", "Selesai & kumpulkan", "Lihat pembahasan"). Pesan error menyebut masalah dan cara memperbaikinya ("Koneksi putus. Jawabanmu disimpan di HP dan akan terkirim saat online.").
**Dilarang:** "Unlock your potential", "Seamless", "Elevate", "Raih mimpimu sekarang!", "Dijamin lulus", "Bocoran", "Soal asli".

### Daftar hindari (dari permintaan pemilik + skill frontend-design)
Hero gradasi ungu/biru · kartu fitur 3 kolom identik · ilustrasi blob · Inter/Roboto/Arial/font sistem · shadcn bawaan tanpa kustom · emoji sebagai ikon · radius besar seragam di semua elemen · glassmorphism · glow · bayangan abu-abu lembut `rgba(0,0,0,.1)` · animasi masuk fade-up di setiap bagian · panah "→" di setiap tombol · label huruf kapital di atas setiap judul.

> Catatan jujur: kertas krem memang termasuk pola yang sering muncul pada desain buatan AI. Di sini warna krem adalah **identitas yang ditetapkan brief**, jadi tetap dipakai. Pembedanya ada pada tekstur kertas sungguhan (petak/folio/margin merah), tepi tinta tebal, maskot, dan stempel. Bukan serif kontras tinggi + aksen terakota.

### Mode malam (direncanakan, bukan di MVP)
"Buku di bawah lampu belajar": latar `#231A12`, kartu `#2E241A`, tinta menjadi krem `#EFE7D6`, emas tetap. Halaman ujian mendapat mode malam lebih dulu karena paling lama ditatap.

### Gerak
Satu momen saja per alur: **stempel jatuh** di halaman hasil (skala 1,4 → 1, rotasi −12° → −7°, 250 ms). Selebihnya hanya umpan balik atas tindakan (opsi terpilih, ragu-ragu, tersimpan). `prefers-reduced-motion` menonaktifkan semuanya.

---

## 2. Tiga arah

### A. Buku Catatan Rapi (paling aman)
- **Font:** Poppins 800 untuk judul, Poppins untuk isi, Space Mono untuk label, Kalam untuk satu coretan per layar.
- **Warna:** dominan krem + kartu putih krem; cokelat untuk tombol utama; emas muda untuk stiker; merah hanya di stempel "Serentak".
- **Komponen kunci:** kertas petak 22px, kartu tinta + bayangan 4px, judul dengan garis bawah bergelombang emas (permintaan brief), stiker miring kecil, hitung mundur event dalam 3 kotak, baris "Kamu" menempel di bawah leaderboard.
- **Mood:** rapi, ramah, bisa dipercaya orang tua. Paling mudah dibangun dan dirawat.
- **Risiko:** paling mungkin terasa "biasa" setelah dilihat berkali-kali.

### B. Map Arsip Taruna (tengah)
- **Font:** Archivo sempit 800–900 (usulan) untuk judul dan nomor peringkat, Poppins untuk isi, Space Mono untuk teks yang terasa diketik.
- **Warna:** kertas folio putih krem bergaris dengan garis margin merah; pita header cokelat tua; map emas muda/cokelat/putih.
- **Komponen kunci:** map bertab sebagai pengganti kartu (tab = judul bagian), penjepit kertas, tabel nilai bergaya buku besar, stempel bergaris ganda "SELESAI", memo dengan bingkai putus-putus.
- **Mood:** serius, disiplin, khas kedinasan. Pas untuk pelamar CPNS kelak dan meyakinkan bagi orang tua.
- **Risiko:** perlu dijaga agar tidak terasa seperti dokumen resmi instansi. Stempel hanya memuat kata netral ("SELESAI", "DICEK"), tidak pernah nama atau lambang instansi.

### C. Buku Tempel Misi (paling berani)
- **Font:** Bowlby One (usulan) untuk judul dan angka besar, Poppins untuk isi, Space Mono untuk chip, Kalam untuk coretan.
- **Warna:** pita cokelat tua dengan sinar emas (meneruskan foto profil "B-sunburst-hormat"), stiker dengan tepi putih ala *die-cut*, emas paling banyak dipakai.
- **Komponen kunci:** "Misi minggu ini", ubin subtes miring, kotak streak 7 hari, skor raksasa bergaris tinta, medali per subtes, lencana baru, podium 3 besar.
- **Mood:** seru dan kompetitif, cocok dipotong untuk konten TikTok/Reels.
- **Risiko:** paling berat dirawat dan paling mudah menjadi terlalu ramai. Streak & lencana adalah fitur tahap 2, jadi di MVP beberapa slot harus diisi hal lain.

### Keputusan pemilik (23 Nov 2026): **Arah C — Buku Tempel Misi**
Catatan penerapan: halaman ujian tetap versi tenang. Slot streak/lencana di beranda MVP diganti "Riwayat tryout terakhir" sampai fitur tahap 2 siap.

### Rekomendasi awal saya (sebelum keputusan)
**B sebagai kerangka, dengan dua unsur C**: pita sinar + skor besar di halaman hasil, dan podium di leaderboard. Alasannya, B paling khas dengan cerita pemilik (mantan taruna, perwira) dan tidak mudah ditiru bimbel lain. B juga tetap tenang untuk orang tua dan pelamar CPNS. Unsur C memberi rasa "game" tepat di layar yang paling sering di-*screenshot*. A adalah cadangan jika ingin cepat dan aman.
