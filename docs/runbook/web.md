# Runbook: Web tryout & panel admin

| | |
| --- | --- |
| Kode | `apps/web` (Next.js 16, Better Auth) |
| Layanan | `can-web` (systemd pengguna) → `127.0.0.1:3000` |
| Akses internet | `can-tunnel` (Cloudflare Tunnel, `cloudflared` 2026.10.7 di `~/.local/bin`) |
| Peserta | `https://tryout.catatanabdinegara.site` |
| Admin | `https://admin.catatanabdinegara.site` (Cloudflare Access + login + TOTP) |
| Database | PostgreSQL lokal, role `can_web` (lihat `database.md`) |

## Tunnel yang terpasang
Tunnel `can-server` (dibuat 27 Nov 2026 lewat `cloudflared tunnel login` + `tunnel create` dari server). Konfigurasi: `~/.cloudflared/can-server.yml`, kredensial `~/.cloudflared/<id>.json` (izin 600). DNS `tryout`/`admin` = CNAME ke tunnel (dibuat `cloudflared tunnel route dns`). Di akun Cloudflare juga ada tunnel lain (`kermakresna`) milik proyek lain — jangan diubah.

## (Alternatif) Pemasangan lewat token dashboard
1. Cloudflare → **Zero Trust** (pilih paket Free; buat nama tim bila diminta) → **Networks → Tunnels → Create a tunnel** → **Cloudflared** → nama: `can-server`.
2. Di layar "Install connector", salin **token** (teks panjang setelah `--token`). Jangan jalankan perintah instalasinya; cukup tokennya.
3. Di server (terminal SSH Anda sendiri):
   ```bash
   install -m 600 /dev/null ~/.config/catatanabdinegara/tunnel.env
   nano ~/.config/catatanabdinegara/tunnel.env     # isi satu baris: TUNNEL_TOKEN=<token>
   cp ~/catatanabdinegara/deploy/can-tunnel.service ~/.config/systemd/user/
   systemctl --user daemon-reload && systemctl --user enable --now can-tunnel
   ```
4. Kembali ke dashboard tunnel → **Public Hostnames → Add**:
   - `tryout` . `catatanabdinegara.site` → Service **HTTP** `127.0.0.1:3000`
   - `admin` . `catatanabdinegara.site` → Service **HTTP** `127.0.0.1:3000`
   DNS dibuat otomatis oleh Cloudflare.

## HSTS di Cloudflare
Header HSTS dari aplikasi tidak selalu terkirim pada halaman yang membaca sesi, jadi HSTS diaktifkan di Cloudflare:
domain `catatanabdinegara.site` → **SSL/TLS → Edge Certificates → HTTP Strict Transport Security (HSTS) → Enable** (max-age 6 bulan, include subdomains: on, preload: off, No-Sniff: on).

## Cloudflare Access untuk admin (lapis keamanan kedua)
Zero Trust → **Access → Applications → Add an application → Self-hosted**:
- Domain: `admin.catatanabdinegara.site`
- Policy: **Allow**, Include → **Emails** → email pemilik
- Login method: **One-time PIN** (kode dikirim ke email)

## Membuat akun admin
1. Daftar biasa di `https://tryout.catatanabdinegara.site/daftar`.
2. Di server: `cd ~/catatanabdinegara && set -a && . ./.env && set +a && pnpm --filter @can/web admin:jadikan <email>`
3. Buka `https://admin.catatanabdinegara.site`, masuk, lalu pasang verifikasi dua langkah (wajib). Simpan kode cadangan.

## Perintah sehari-hari
| Keperluan | Perintah |
| --- | --- |
| Log web | `journalctl --user -u can-web -f` |
| Log tunnel | `journalctl --user -u can-tunnel -f` |
| Update kode web | `cd ~/catatanabdinegara && git pull && pnpm install --frozen-lockfile && (cd apps/web && set -a && . ../../.env && set +a && pnpm build) && systemctl --user restart can-web` |
| Restart | `systemctl --user restart can-web can-tunnel` |

Migrasi tabel web berjalan otomatis sebelum `can-web` start (`scripts/migrasi.ts`); tabel login Better Auth dibuat saat server menyala.
