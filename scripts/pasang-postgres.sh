#!/usr/bin/env bash
# Pasang PostgreSQL 17 (repo resmi PGDG) di Ubuntu 22.04 untuk Catatan Abdi Negara.
# Jalankan SEKALI dari terminal SSH Anda (butuh password sudo):
#   sudo bash ~/catatanabdinegara/scripts/pasang-postgres.sh
#
# Yang dilakukan:
#  1. Menambah repo resmi apt.postgresql.org dan memasang postgresql-17.
#  2. Membuat role Postgres bernama sama dengan user Linux Anda (login lewat socket lokal,
#     tanpa password) dengan hak CREATEDB & CREATEROLE, supaya database & role aplikasi
#     (can_web, bot_rw) bisa dibuat tanpa sudo lagi.
# Postgres hanya mendengarkan di localhost (bawaan): TIDAK terbuka ke internet.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Jalankan dengan sudo: sudo bash $0" >&2
  exit 1
fi
TARGET_USER="${SUDO_USER:-}"
if [ -z "$TARGET_USER" ] || [ "$TARGET_USER" = "root" ]; then
  echo "Jalankan lewat sudo dari akun biasa (mis. dipsy), bukan langsung sebagai root." >&2
  exit 1
fi

# Sisa instalasi dari ISO: baris "file:/cdrom" membuat apt-get update selalu gagal
# (dan server tidak mendapat pembaruan keamanan). Nonaktifkan dengan cadangan .bak.
if grep -qE '^[[:space:]]*deb .*cdrom' /etc/apt/sources.list 2>/dev/null; then
  echo "==> Menonaktifkan sumber apt CD-ROM (cadangan: /etc/apt/sources.list.bak)"
  cp -n /etc/apt/sources.list /etc/apt/sources.list.bak
  sed -i -E 's|^([[:space:]]*deb .*cdrom.*)$|# \1|' /etc/apt/sources.list
fi

echo "==> Menambah repo resmi PostgreSQL (apt.postgresql.org)"
apt-get update
apt-get install -y -qq postgresql-common ca-certificates curl >/dev/null
/usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y >/dev/null

echo "==> Memasang PostgreSQL 17"
apt-get install -y -qq postgresql-17 >/dev/null
systemctl enable --now postgresql

echo "==> Membuat role '$TARGET_USER' (CREATEDB, CREATEROLE)"
sudo -u postgres psql -v ON_ERROR_STOP=1 -q <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$TARGET_USER') THEN
    CREATE ROLE "$TARGET_USER" LOGIN CREATEDB CREATEROLE;
  ELSE
    ALTER ROLE "$TARGET_USER" LOGIN CREATEDB CREATEROLE;
  END IF;
END
\$\$;
SQL

echo "==> Selesai"
pg_lsclusters
sudo -u postgres psql -tAc "show listen_addresses" | sed 's/^/listen_addresses = /'
echo
echo "Kabari Claude bahwa PostgreSQL sudah terpasang."
