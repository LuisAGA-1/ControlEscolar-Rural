#!/usr/bin/env bash
# Prepara un EC2 Ubuntu 24.04 recién creado. Córrelo una sola vez: bash instalar-en-ec2.sh
set -euo pipefail
sudo apt-get update
sudo apt-get install -y dotnet-runtime-8.0 aspnetcore-runtime-8.0 nginx postgresql-client
id controlescolar >/dev/null 2>&1 || sudo useradd -m -r -s /usr/sbin/nologin controlescolar
sudo mkdir -p /opt/controlescolar
sudo cp controlescolar.service /etc/systemd/system/
sudo cp nginx-controlescolar.conf /etc/nginx/sites-available/controlescolar
sudo ln -sf /etc/nginx/sites-available/controlescolar /etc/nginx/sites-enabled/controlescolar
sudo rm -f /etc/nginx/sites-enabled/default
[ -f /etc/controlescolar.env ] || sudo install -m 600 controlescolar.env.ejemplo /etc/controlescolar.env
sudo systemctl daemon-reload
sudo systemctl enable controlescolar nginx
sudo systemctl restart nginx
echo "Listo. Ahora edita /etc/controlescolar.env (sudo nano /etc/controlescolar.env) y sube la app con publicar.sh"
