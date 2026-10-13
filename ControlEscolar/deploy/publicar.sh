#!/usr/bin/env bash
# Pone una versión nueva de la app. Uso: bash publicar.sh publish.tar.gz
set -euo pipefail
sudo systemctl stop controlescolar || true
sudo rm -rf /opt/controlescolar/*
sudo tar -xzf "${1:-publish.tar.gz}" -C /opt/controlescolar
sudo chown -R controlescolar: /opt/controlescolar
sudo systemctl start controlescolar
sleep 3
curl -fsS -o /dev/null -w "La app responde: HTTP %{http_code}\n" http://127.0.0.1:5000/Login
