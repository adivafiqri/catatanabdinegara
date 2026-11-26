# Runbook: Halaman "segera hadir" (catatanabdinegara.site)

Kode: `apps/landing/` (HTML statis, tanpa build). Tayang di **Cloudflare Workers + Static Assets**, deploy otomatis setiap push ke `main`.

## Pengaturan proyek Worker "catatanabdinegara"
| Pengaturan | Nilai |
| --- | --- |
| Repo / branch produksi | `adivafiqri/catatanabdinegara` / `main` |
| Root directory | `apps/landing` |
| Build command | (kosong) |
| Deploy command | `npx wrangler deploy` (membaca `apps/landing/wrangler.jsonc`) |
| Custom domain | `catatanabdinegara.site`, `www.catatanabdinegara.site` |

Nama Worker harus sama dengan `name` di `wrangler.jsonc`.

## Pengaturan domain (Cloudflare → catatanabdinegara.site)
- Nameserver: `darl.ns.cloudflare.com`, `liberty.ns.cloudflare.com` (diatur di DomaiNesia; kunci transfer aktif)
- DNS: `www` CNAME → `catatanabdinegara.site` (proxied)
- SSL/TLS: Full · Always Use HTTPS: On · Minimum TLS: 1.2
- Header keamanan (CSP, HSTS, dll.) diatur di `apps/landing/_headers`

## Cek cepat setelah perubahan
```bash
curl -sI https://catatanabdinegara.site | grep -iE "content-security|strict-transport"
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://catatanabdinegara.site/   # harus 301 ke https
```

## Saat web tryout (Milestone 3) siap
Domain utama dipindah ke aplikasi web. Halaman ini bisa dihapus atau dijadikan halaman `/segera` sementara.
