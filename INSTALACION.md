# Instalación en Ubuntu (WSL)

Toda la plataforma corre con Docker Compose: la base de datos, la API, el portal, n8n, Ollama y un túnel https
para Telegram. Probado con Ubuntu 24.04 en WSL. Los mismos pasos sirven en un servidor Ubuntu.

| Servicio | Qué es | Dirección |
|---|---|---|
| `web` | Portal React servido por nginx, que reenvía `/api` a la API | http://localhost:8080 |
| `api` | Backend Node.js (hexagonal) | solo dentro de Docker (`api:3000`) |
| `db` | PostgreSQL 16; la primera vez carga `database/001` y `002` | `localhost:5433` (pgAdmin/psql) |
| `n8n` | Flujo del bot | http://localhost:5678 |
| `ollama` + `ollama-modelo` | IA local; el segundo descarga el modelo una vez y se apaga | solo dentro de Docker |
| `tunel` | Cloudflare Tunnel: dirección https pública para que Telegram llegue a n8n | ver sus logs |

## 1. Docker en WSL
Ubuntu 24.04 en WSL ya trae systemd. En la terminal de Ubuntu:
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER
docker run --rm hello-world        # comprobar
```
Si sale `permission denied ... docker.sock`, el permiso aún no se aplicó: cerrar la ventana no basta en WSL.
Ejecuta `wsl --shutdown` en PowerShell y abre Ubuntu de nuevo (o, solo para esa terminal, `newgrp docker`).
Si ya usas Docker Desktop en Windows con la integración de WSL activada, sáltate este paso.

## 2. Código y claves
```bash
git clone https://github.com/LuisAGA-1/ControlEscolar-Rural.git
cd ControlEscolar-Rural
cp .env.example .env
for v in DB_PASSWORD JWT_SECRET BOT_API_TOKEN; do sed -i "s/^$v=.*/$v=$(openssl rand -hex 24)/" .env; done
nano .env      # pega TELEGRAM_BOT_TOKEN (el de @BotFather) y, si quieres, VITE_BOT_TELEGRAM
```
`.env` no se sube a GitHub.

## 3. Levantar todo
```bash
docker compose up -d --build
docker compose logs -f ollama-modelo     # espera a "success" (descarga ~2 GB la primera vez)
```
Abre http://localhost:8080 y entra con los usuarios de prueba (`admin@escuela.mx` / `docente123`,
`A260001` / `alumno123`).

## 4. Bot de Telegram
```bash
docker compose logs tunel | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com'
```
1. Copia esa dirección en `WEBHOOK_URL=` de `.env` y aplica el cambio con `docker compose up -d n8n`.
2. Entra a http://localhost:5678, crea tu usuario de n8n, importa `n8n/bot-siae.json`, llena las dos
   credenciales y activa el flujo (detalles en [n8n/README.md](n8n/README.md)).
3. En el portal abre **Bot de Telegram**, genera el código y mándale al bot `/vincular 123456`.

La dirección del túnel gratuito cambia cada vez que arranca el servicio `tunel`, también al reiniciar la
computadora o WSL. Cuando cambie, repite el paso 1 y desactiva y vuelve a activar el flujo en n8n. Para una
dirección fija hace falta una cuenta de Cloudflare con un túnel con nombre, o un servidor con dominio propio.

## Día a día
| Para | Comando |
|---|---|
| Ver el estado | `docker compose ps` |
| Ver errores de la API | `docker compose logs -f api` |
| Actualizar después de un `git pull` | `docker compose up -d --build` |
| Apagar (los datos se quedan) | `docker compose stop` |
| Respaldar la base | `docker compose exec db pg_dump -U postgres control_escolar > respaldo.sql` |
| Volver a la base de prueba desde cero | `docker compose down` y `docker volume rm control-escolar_datos-db`, luego `up -d` |

Los servicios tienen `restart: unless-stopped`, así que vuelven solos cuando arranca Docker. No hace falta
systemd ni pm2. En WSL, Docker arranca al abrir Ubuntu.

## Notas
- **Memoria:** Ollama con `qwen2.5:3b` usa unos 3 GB de RAM. Si WSL tiene poca memoria, súbela en
  `%UserProfile%\.wslconfig` (`[wsl2]` y `memory=8GB`). Con más equipo puedes cambiar `OLLAMA_MODELO` a
  `qwen2.5:7b`, y cambiarlo también en el nodo Ollama del flujo.
- **pgAdmin de Windows:** conéctate a `localhost`, puerto `5433`, usuario `postgres` y la `DB_PASSWORD` de `.env`.
  Esta base es otra; la de pgAdmin (puerto 5432) no se toca.
- **Un servidor real:** cambia `URL_PUBLICA` por la dirección del sitio (se imprime en las constancias) y pon
  https delante del puerto 8080 (por ejemplo, Caddy o nginx con certbot). En lugar del túnel gratuito, usa un
  túnel con nombre o el dominio propio en `WEBHOOK_URL`.
- **Desarrollo sin Docker:** sigue el README (backend con `npm run dev` y frontend con Vite).
