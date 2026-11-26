#!/usr/bin/env bash
# Cadangan harian PostgreSQL (schema bot & web) ke ~/cadangan-db, disimpan 14 hari.
# Dijalankan oleh timer systemd pengguna "can-cadangan" (lihat docs/runbook/database.md).
# Cadangan di luar server (wajib untuk keamanan data) ditambahkan terpisah.
set -euo pipefail
umask 077
ENV_FILE="${ENV_FILE:-$HOME/catatanabdinegara/.env}"
DEST="${DEST:-$HOME/cadangan-db}"
KEEP_DAYS="${KEEP_DAYS:-14}"
mkdir -p "$DEST"

val() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2-; }
BOT_URL="$(val BOT_DATABASE_URL)"
WEB_URL="$(val WEB_DATABASE_URL)"
STAMP="$(date +%Y-%m-%d_%H%M)"

# pg_dump membaca password dari URL; tidak pernah dicetak.
pg_dump --dbname="$BOT_URL" --schema=bot --format=custom --compress=9 --no-owner --file="$DEST/bot_$STAMP.dump"
pg_dump --dbname="$WEB_URL" --schema=public --schema=drizzle --format=custom --compress=9 --no-owner --file="$DEST/web_$STAMP.dump"

# Uji bahwa berkas bisa dibaca (bukan berkas rusak/kosong).
for f in "$DEST/bot_$STAMP.dump" "$DEST/web_$STAMP.dump"; do
  pg_restore --list "$f" >/dev/null
done

find "$DEST" -name '*.dump' -type f -mtime +"$KEEP_DAYS" -delete
echo "cadangan OK: $(ls -1 "$DEST"/*_"$STAMP".dump | xargs -n1 basename | tr '\n' ' ')"
