#!/usr/bin/env bash
# Memasang Cloudflare Tunnel (connector) sebagai layanan pengguna. Jalankan dari terminal SSH Anda:
#   bash ~/catatanabdinegara/scripts/pasang-tunnel.sh
# Token diminta tanpa ditampilkan dan disimpan di ~/.config/catatanabdinegara/tunnel.env (izin 600).
set -euo pipefail
umask 077
CONF="$HOME/.config/catatanabdinegara"
mkdir -p "$CONF"

echo "Tempel TOKEN tunnel dari dashboard Cloudflare (boleh juga seluruh perintah 'cloudflared ... --token ...')."
echo "Teks tidak akan terlihat saat ditempel. Tekan Enter setelahnya."
IFS= read -rs INPUT
echo
TOKEN="$(printf '%s' "$INPUT" | grep -oE 'eyJ[A-Za-z0-9_=-]+(\.[A-Za-z0-9_=-]+)*' | head -1 || true)"
[ -z "$TOKEN" ] && TOKEN="$(printf '%s' "$INPUT" | tr -d '[:space:]')"
if [ ${#TOKEN} -lt 50 ]; then
  echo "Token tidak dikenali (terlalu pendek). Salin ulang dari dashboard lalu jalankan lagi." >&2
  exit 1
fi
printf 'TUNNEL_TOKEN=%s\n' "$TOKEN" > "$CONF/tunnel.env"
chmod 600 "$CONF/tunnel.env"
unset TOKEN INPUT

mkdir -p "$HOME/.config/systemd/user"
cp "$HOME/catatanabdinegara/deploy/can-tunnel.service" "$HOME/.config/systemd/user/"
systemctl --user daemon-reload
systemctl --user enable --now can-tunnel
sleep 6
if systemctl --user is-active -q can-tunnel && journalctl --user -u can-tunnel -n 40 -o cat --no-pager | grep -q "Registered tunnel connection"; then
  echo "Tunnel tersambung. Sekarang tambahkan Public Hostname di dashboard (lihat docs/runbook/web.md), lalu kabari Claude."
else
  echo "Tunnel belum tersambung. 20 baris log terakhir:"
  journalctl --user -u can-tunnel -n 20 -o cat --no-pager | sed -E 's/eyJ[A-Za-z0-9_.=-]+/<rahasia>/g'
fi
