# Despliegue en AWS (EC2 con Ubuntu)

La plataforma completa (base de datos, API, portal, n8n, Ollama) corre en **una sola instancia EC2** con el
mismo `docker-compose.yml` que usas en WSL. Lo único que cambia en el servidor:

- **Caddy** (`docker-compose.aws.yml` y `aws/Caddyfile`) pone https con certificado gratuito de Let's Encrypt.
  Manda `/webhook/...` a n8n, que es lo que usa Telegram, y todo lo demás al portal.
- **Ya no hay túnel.** Con una IP elástica la dirección no cambia, así que no hace falta `actualizar-tunel.sh`
  ni reactivar el flujo en cada arranque.
- **Dominio sin comprarlo:** [sslip.io](https://sslip.io) convierte la IP en un nombre. Por ejemplo,
  `3-91-12-34.sslip.io` apunta a `3.91.12.34`. Si tienes un dominio propio, úsalo en su lugar.
- El editor de n8n y la base **no quedan abiertos a internet**. Para usarlos abres un túnel SSH desde tu máquina.

```
Internet ──443──► caddy ──► web (portal + /api) ──► api ──► db
                    └─ /webhook/* ──► n8n ──► api, ollama
Tu PC ──SSH──► :5678 n8n (editor)
```

## 0. ¿Qué cuenta de AWS?
- **AWS Academy (Learner Lab):** entra al curso, abre el Learner Lab y pulsa **Start Lab**. Cuando el punto
  se ponga verde, pulsa **AWS** para abrir la consola. La región es la que trae el laboratorio (normalmente
  `us-east-1`); no la cambies. La sesión dura 4 horas. Al terminar, AWS **apaga** la instancia, y la vuelve a
  prender cuando inicias el laboratorio otra vez. Tus datos se quedan. La llave SSH ya existe: se llama
  `vockey`, y el archivo `labsuser.pem` se descarga en **AWS Details → Download PEM**.
- **Cuenta normal:** usa la región `us-east-1` y crea un par de llaves en **EC2 → Key pairs → Create key pair**
  (formato `.pem`). Cuesta alrededor de 0.09 USD por hora encendida (t3.large) más la IP elástica.
  Apágala cuando no la uses.

## 1. Reservar una IP elástica
**EC2 → Elastic IPs → Allocate Elastic IP address → Allocate.** Anota la IP (por ejemplo, `3.91.12.34`).
Tu dominio será la IP con guiones: `3-91-12-34.sslip.io`.

## 2. Crear la instancia
**EC2 → Instances → Launch instances:**

| Campo | Valor |
|---|---|
| Name | `control-escolar` |
| AMI | **Ubuntu Server 24.04 LTS** (64-bit x86) |
| Instance type | **t3.large** (2 vCPU, 8 GB). Ollama necesita la memoria: con 4 GB se queda sin RAM |
| Key pair | `vockey` (Learner Lab) o la que creaste |
| Network settings → Edit | Crear security group `control-escolar` con 3 reglas: **SSH 22** (Source: My IP), **HTTP 80** y **HTTPS 443** (Source: Anywhere). No abras 5678, 8080 ni 5433 |
| Storage | **30 GiB gp3** (las imágenes y el modelo ocupan unos 10 GB) |
| Advanced details → User data | Pega el contenido de [`aws/preparar-servidor.sh`](aws/preparar-servidor.sh) |

Pulsa **Launch instance**. El *User data* instala Docker y clona el repositorio en el primer arranque.

Después ve a **Elastic IPs**, selecciona la IP, elige **Actions → Associate Elastic IP address**, escoge la
instancia `control-escolar` y pulsa **Associate**.

## 3. Entrar por SSH
Desde la terminal de Ubuntu (WSL), con el `.pem` en Descargas:
```bash
cp "/mnt/c/Users/Luis Angel/Downloads/labsuser.pem" ~/.ssh/aws.pem && chmod 600 ~/.ssh/aws.pem
ssh -i ~/.ssh/aws.pem ubuntu@3.91.12.34          # tu IP elástica
```
En el servidor, espera a que termine la instalación (2 o 3 minutos):
```bash
cloud-init status --wait          # debe decir "status: done"
docker --version && ls ~/ControlEscolar-Rural
```
Si dice `error`, revisa `sudo tail -50 /var/log/cloud-init-output.log`. Si la carpeta no existe, puedes correr
el script a mano: `curl -fsSL https://raw.githubusercontent.com/LuisAGA-1/ControlEscolar-Rural/main/aws/preparar-servidor.sh | sudo bash`.
**Sal y vuelve a entrar por SSH** para que tu usuario pueda usar `docker` sin `sudo`.

## 4. Claves y dominio (`.env`)
```bash
cd ~/ControlEscolar-Rural
cp .env.example .env
for v in DB_PASSWORD JWT_SECRET BOT_API_TOKEN; do sed -i "s/^$v=.*/$v=$(openssl rand -hex 24)/" .env; done
DOMINIO=$(curl -s https://checkip.amazonaws.com | tr . -).sslip.io && echo $DOMINIO
sed -i "s#^URL_PUBLICA=.*#URL_PUBLICA=https://$DOMINIO#; s#^WEBHOOK_URL=.*#WEBHOOK_URL=https://$DOMINIO/#" .env
cat >> .env <<FIN
COMPOSE_FILE=docker-compose.yml:docker-compose.aws.yml
DOMINIO=$DOMINIO
PUERTO_WEB=127.0.0.1:8080
FIN
nano .env      # pega TELEGRAM_BOT_TOKEN (el mismo de @BotFather) y, si quieres, VITE_BOT_TELEGRAM
```
`checkip` debe dar tu IP elástica. Si da otra, asocia primero la IP (paso 2) y repite la línea `DOMINIO=`.
`COMPOSE_FILE` hace que `docker compose` use también `docker-compose.aws.yml` sin escribirlo cada vez.

## 5. Levantar todo
```bash
docker compose up -d --build
docker compose logs -f ollama-modelo     # espera "success" y sal con Ctrl+C
docker compose ps                         # todo "running" (ollama-modelo termina y se apaga, es normal)
```
Abre `https://3-91-12-34.sslip.io` (tu dominio) y entra con `admin@escuela.mx` / `docente123`. La base
empieza con los mismos datos de prueba. El primer acceso puede tardar unos segundos mientras Caddy saca el
certificado. Si falla, revisa `docker compose logs caddy` y que el security group tenga abiertos el 80 y el 443.

## 6. Bot de Telegram
Un bot solo puede mandar sus mensajes a **un** webhook. Antes de seguir, en tu WSL desactiva el flujo en
n8n o apágalo con `docker compose stop n8n tunel`. Si no lo haces, se pelearán el bot.

1. Abre un túnel SSH al editor de n8n. Desde WSL, en otra terminal (déjala abierta):
   ```bash
   ssh -i ~/.ssh/aws.pem -N -L 5678:localhost:5678 ubuntu@3.91.12.34
   ```
   En el navegador de Windows abre http://localhost:5678 y crea el usuario de n8n del servidor.
2. Importa `n8n/bot-siae.json` y llena las dos credenciales: el token de @BotFather y el `BOT_API_TOKEN` del
   `.env` **del servidor** (`grep BOT_API_TOKEN .env`). Luego **activa** el flujo. Los pasos son los mismos
   que en [n8n/README.md](n8n/README.md).
3. Comprueba que Telegram apunta al servidor:
   ```bash
   curl -s "https://api.telegram.org/bot$(grep ^TELEGRAM_BOT_TOKEN .env | cut -d= -f2)/getWebhookInfo"
   ```
   `url` debe empezar con `https://<tu dominio>/webhook/`, sin `last_error_message`.
4. En el portal del servidor abre **Bot de Telegram**, genera el código y mándale al bot `/vincular 123456`.
   Las vinculaciones que tenías en WSL no se pasan, porque es otra base.

Ollama corre en CPU, así que cada respuesta del bot tarda de 5 a 15 segundos.

## Día a día
| Para | Comando (en el servidor, dentro de `~/ControlEscolar-Rural`) |
|---|---|
| Ver el estado | `docker compose ps` |
| Ver errores | `docker compose logs -f api` (o `caddy`, `n8n`) |
| Actualizar después de cambios en GitHub | `git pull && docker compose up -d --build` |
| Respaldar la base a tu PC | en el servidor `docker compose exec -T db pg_dump -U postgres control_escolar > respaldo.sql`; en WSL `scp -i ~/.ssh/aws.pem ubuntu@3.91.12.34:ControlEscolar-Rural/respaldo.sql .` |
| Apagar para no gastar | **EC2 → Instances → Instance state → Stop** (los datos se quedan) |

Al volver a prender la instancia (o al iniciar el Learner Lab) todo arranca solo: Docker está habilitado y los
servicios tienen `restart: unless-stopped`. La IP elástica no cambia, así que el dominio, el certificado y el
webhook de Telegram siguen iguales. No hay que reactivar nada.

## Problemas comunes
- **El sitio no abre:** `docker compose ps`. Si `caddy` se reinicia una y otra vez, falta `DOMINIO` en `.env`.
  Si el certificado no sale, revisa que `DOMINIO` sea la IP elástica con guiones y que el 80 y el 443 estén abiertos.
- **SSH se queda esperando:** la regla de SSH es solo para "My IP". Si cambiaste de red, edita la regla en el
  security group.
- **El bot no contesta:** usa `getWebhookInfo` (paso 6.3). Si `url` sale vacío, el flujo no está activo. Si sale
  un `trycloudflare.com`, el flujo de WSL se activó después: desactívalo allá y vuelve a activar el del servidor.
- **Poca memoria:** `free -h`. Con t3.medium (4 GB), Ollama se queda corto.
- **Ya tienes dominio propio:** crea un registro **A** que apunte a la IP elástica y pon ese nombre en
  `DOMINIO`, `URL_PUBLICA` y `WEBHOOK_URL`. Después corre `docker compose up -d` y reactiva el flujo de n8n.
