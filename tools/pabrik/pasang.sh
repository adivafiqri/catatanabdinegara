#!/usr/bin/env bash
# Memasang pabrik video Catatan Abdi Negara ke /home/claude (jalur yang dipakai kode).
# Pemakaian (dari root repo):  bash tools/pabrik/pasang.sh
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)/root"
DST=/home/claude
mkdir -p "$DST"
cp -r "$SRC"/. "$DST"/
mkdir -p "$DST/pabrik/out" "$DST/sfx/out"
echo "Pabrik terpasang di $DST/pabrik"
# Cek cepat: modul bisa diimpor dan alat yang dibutuhkan ada.
cd "$DST/pabrik"
python3 -c "import sys; sys.path.insert(0,'.'); import pabrik, motion, ilustrasi, sampul" >/dev/null && echo "Impor modul: OK"
for t in ffmpeg ffprobe rsvg-convert; do command -v "$t" >/dev/null && echo "$t: OK" || echo "$t: TIDAK ADA"; done
