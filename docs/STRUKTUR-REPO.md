# Struktur Repo & Konvensi Kode

Versi 0.1 · 23 November 2026 · Monorepo **pnpm workspaces + Turborepo**, Node 22 LTS.

---

## 1. Struktur folder

```
catatanabdinegara/
├── apps/
│   ├── web/                     # Next.js: situs, ujian, admin, API
│   │   ├── app/
│   │   │   ├── (publik)/        # beranda, materi, kebijakan, leaderboard
│   │   │   ├── (akun)/          # masuk, daftar, profil, riwayat
│   │   │   ├── ujian/[attemptId]/
│   │   │   ├── hasil/[attemptId]/
│   │   │   ├── admin/           # bank soal, paket, event, tinjau, pengaturan bot
│   │   │   └── api/
│   │   │       ├── attempt/     # mulai, simpan, selesai
│   │   │       ├── bot/v1/      # API bertoken untuk bot
│   │   │       └── cron/        # auto-submit, rebuild leaderboard
│   │   ├── components/          # komponen UI (sistem desain)
│   │   ├── lib/                 # klien supabase, redis, auth helper
│   │   ├── styles/              # token desain, font self-host
│   │   └── tests/e2e/           # Playwright
│   └── bot/                     # grammY
│       ├── src/
│       │   ├── handlers/        # sapaan, verifikasi, moderasi, perintah
│       │   ├── moderation/      # detektor spam (fungsi murni)
│       │   ├── scheduler/       # tick per menit: verifikasi, posting, outbox
│       │   ├── texts/           # semua teks bot (bahasa kakak tingkat)
│       │   └── main.ts          # polling (dev) / webhook (prod)
│       └── Dockerfile
├── packages/
│   ├── shared/                  # Zod schema, scoreAttempt, shuffle, tipe, konstanta
│   ├── db/                      # Drizzle schema, migrasi SQL, seed, klien
│   └── config/                  # tsconfig, eslint, prettier bersama
├── assets/
│   ├── maskot/                  # svg & png ekspresi (dipindah dari maskot-adiva/)
│   └── foto-profil/
├── docs/
│   ├── *.md                     # dokumen ini
│   ├── adr/                     # catatan keputusan arsitektur
│   ├── runbook/                 # deploy, insiden, rotasi secret
│   └── mockup/                  # mockup statis arah desain
├── scripts/                     # soal:cek, lb:rebuild, backup
├── .github/workflows/ci.yml
├── .env.example
├── turbo.json
├── pnpm-workspace.yaml
└── README.md
```

> Saat M1 dimulai, aset di root (`A-cokelat-senyum.png`, dst., `maskot-adiva/`, `maskot-adiva.zip`) akan dipindah ke `assets/`. File PNG di root ternyata duplikat dari `foto-profil/`, dan `.zip` duplikat dari folder `maskot-adiva/`. Saya usulkan menghapus duplikatnya; **menunggu persetujuan Anda**.

## 2. Aturan ketergantungan

```
apps/web ──▶ packages/shared, packages/db
apps/bot ──▶ packages/shared, packages/db (hanya modul bot_*)
packages/db ──▶ packages/shared
packages/shared ──▶ (tidak bergantung pada apa pun selain zod)
```
- `packages/shared` **tidak boleh** mengimpor Next.js, grammY, atau klien DB. Dengan begitu fungsi penilaian bisa dites dan dipakai di mana saja.
- Bot **tidak** mengimpor dari `apps/web`; komunikasinya lewat API/DB.

## 3. Konvensi kode

| Hal | Aturan |
| --- | --- |
| Bahasa kode | Identifier dalam bahasa Inggris (`scoreAttempt`, `questions`). Teks UI, teks bot, pesan error ke pengguna, dan dokumen dalam bahasa Indonesia. Komentar boleh Indonesia. |
| Teks UI | Tidak ditulis langsung di komponen; dikumpulkan di `texts.ts` per fitur agar mudah disunting dan konsisten (siap i18n bila perlu) |
| TypeScript | `strict: true`, tanpa `any` (pakai `unknown` + Zod), tanpa `// @ts-ignore` tanpa alasan tertulis |
| Penamaan file | `kebab-case.ts`; komponen React `PascalCase.tsx` |
| Fungsi | Kecil & murni bila mungkin; efek samping (DB, jaringan) di pinggir |
| Error | Error domain bertipe (`AttemptExpiredError`) → dipetakan ke pesan Indonesia di batas API; jangan menelan error diam-diam |
| Validasi | Semua input dari luar (request, update Telegram, file impor, env) lewat Zod |
| Env | Dibaca sekali lewat `env.ts` per app yang divalidasi Zod; build gagal bila ada yang kurang |
| Waktu | Simpan UTC, tampilkan WIB (`Asia/Jakarta`) lewat satu helper |
| CSS | CSS Modules + custom properties dari token desain; **tanpa** kit komponen bawaan yang belum dikustom (lihat ARAH-DESAIN) |
| Tes | `*.test.ts` di sebelah file yang dites; E2E di `apps/web/tests/e2e` |
| Commit | Conventional Commits berbahasa Indonesia: `feat(bot): verifikasi anggota baru`, `fix(web): timer tidak berhenti saat offline` |
| Cabang | `main` selalu bisa deploy; kerja di `m1/…`, `m2/…`; merge lewat PR yang lulus CI |
| Secret | Tidak pernah di kode, log, atau pesan error. `.env.example` diperbarui setiap ada variabel baru. |

## 4. Perintah standar (direncanakan)

```
pnpm dev            # web + bot (polling) + supabase lokal
pnpm test           # vitest semua paket
pnpm test:e2e       # playwright
pnpm lint && pnpm typecheck
pnpm db:migrate     # drizzle migrate
pnpm soal:cek <file>   # validasi file impor tanpa menyimpan
pnpm lb:rebuild     # bangun ulang leaderboard dari Postgres
```
