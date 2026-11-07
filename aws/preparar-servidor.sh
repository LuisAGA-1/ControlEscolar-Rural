#!/usr/bin/env bash
# Pégalo en "User data" al crear la instancia EC2 (Ubuntu 24.04): corre una vez como root al primer arranque.
# Instala Docker y deja el código en /home/ubuntu/ControlEscolar-Rural. Avance: /var/log/cloud-init-output.log
set -euxo pipefail
apt-get update
apt-get install -y docker.io docker-compose-v2 git
systemctl enable --now docker
usermod -aG docker ubuntu
sudo -u ubuntu git clone https://github.com/LuisAGA-1/ControlEscolar-Rural.git /home/ubuntu/ControlEscolar-Rural
