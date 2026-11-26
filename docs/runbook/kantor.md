# Runbook: Kantor tim AI (kantor.catatanabdinegara.site)

Kode: `apps/kantor/` (HTML statis, tanpa build). Halaman pixel-art berisi Boss Dipsy dan 7 "karyawan" AI pembuat konten. Status setiap karyawan dibaca dari `apps/kantor/status.json` setiap 30 detik. Tayang di **Cloudflare Workers + Static Assets**, sama seperti `apps/landing`, dan deploy otomatis setiap push ke `main`. **Tidak ada yang dipasang di VPS.**

## Pengaturan proyek Worker "kantor-catatanabdinegara" (sekali saja)

Cloudflare → Workers & Pages → Create → Import a repository:

| Pengaturan | Nilai |
| --- | --- |
| Repo / branch produksi | `adivafiqri/catatanabdinegara` / `main` |
| Nama proyek | `kantor-catatanabdinegara` (harus sama dengan `name` di `wrangler.jsonc`) |
| Root directory | `apps/kantor` |
| Build command | (kosong) |
| Deploy command | `npx wrangler deploy` |
| Custom domain | `kantor.catatanabdinegara.site` |

## Kunci dengan Cloudflare Access (wajib)

Halaman ini memuat rencana konten, jadi hanya pemilik yang boleh membuka.

Cloudflare Zero Trust → Access → Applications → Add → **Self-hosted**:

- Application domain: `kantor.catatanabdinegara.site`
- Policy: **Allow**, Include → Emails → email pemilik
- Login method: One-time PIN (kode dikirim ke email) atau Google

Cek dari jendela incognito: `https://kantor.catatanabdinegara.site` harus menampilkan halaman login Cloudflare Access, bukan langsung menampilkan kantor.

## Mengubah status karyawan

Ubah `apps/kantor/status.json`, lalu push ke `main`. Bisa juga diubah oleh Claude. Situs ter-deploy ulang otomatis dalam ±1 menit.

| `status` | Yang terjadi di kantor |
| --- | --- |
| `kerja` | Duduk di meja, layar PC menyala |
| `blokir` | Duduk di meja, gelembung masalah tampil |
| `tunggu` | Jalan-jalan keliling kantor |
| `selesai` | Ke ruang istirahat: main PS, sofa, makan, atau ngopi |

ID: `boss`, `rena`, `nasa`, `suara` (Vico), `edo`, `desi`, `qiqi`, `sosi`. Notifikasi ditambahkan ke daftar `notif`. Isi `"dibaca": false` agar muncul lencana merah.

## Jika `index.html` diubah

CSP di `apps/kantor/_headers` mengizinkan skrip inline lewat hash `sha256`. Setiap isi `<script>` di `index.html` berubah, hash-nya harus dihitung ulang:

```bash
python3 -c "import re,hashlib,base64;s=open('apps/kantor/index.html').read();print(*[\"'sha256-\"+base64.b64encode(hashlib.sha256(x.encode()).digest()).decode()+\"'\" for x in re.findall(r'<script>(.*?)</script>',s,re.S)])"
```

Salin hasilnya ke bagian `script-src` di `_headers`. Kalau hash tidak cocok, halaman tampil tanpa karakter karena skrip diblokir.
