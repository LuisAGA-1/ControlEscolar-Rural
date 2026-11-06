#!/usr/bin/env bash
# Después de prender la máquina: levanta todo y le pasa a n8n la dirección nueva del túnel,
# que cambia en cada arranque. Uso: ./actualizar-tunel.sh
set -euo pipefail
cd "$(dirname "$0")"
docker compose up -d

# Solo los logs del arranque actual del túnel, para no tomar una dirección vieja.
desde=$(docker inspect -f '{{.State.StartedAt}}' "$(docker compose ps -q tunel)")
url=""
for _ in $(seq 1 30); do
  url=$(docker compose logs --since "$desde" tunel 2>/dev/null | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1 || true)
  [ -n "$url" ] && break
  sleep 2
done
[ -n "$url" ] || { echo "El túnel no dio dirección. Revisa: docker compose logs tunel"; exit 1; }

if grep -q "^WEBHOOK_URL=$url$" .env; then
  echo "La dirección no cambió: $url"
  exit 0
fi
sed -i "s#^WEBHOOK_URL=.*#WEBHOOK_URL=$url#" .env
docker compose up -d n8n
echo "Túnel nuevo: $url"
echo "Ahora en n8n (http://localhost:5678) desactiva y vuelve a activar el flujo del bot."
