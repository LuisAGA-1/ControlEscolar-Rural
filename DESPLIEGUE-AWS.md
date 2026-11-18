# Despliegue en AWS con 3 instancias (FRONT, BACK y BD)

Cada capa va en su propia instancia EC2 con Ubuntu 24.04 y Docker. Solo FRONT está abierta a internet.
BACK solo acepta conexiones de FRONT, y BD solo de BACK. Entre ellas se hablan por **IP privada**, que no
cambia aunque la instancia se apague y se vuelva a prender.

```
Internet ──443──► FRONT  (Caddy https + portal React)
                    │  /api/*      ──3000──►  BACK  (API Node.js) ──5432──►  BD  (PostgreSQL 16)
                    └─ /webhook/*  ──5678──►  BACK  (n8n ──► Ollama)
```

| Instancia | Qué corre | Archivos | Tipo | Disco |
|---|---|---|---|---|
| `ce-bd` | PostgreSQL con el esquema y los datos de prueba (`database/`) | `aws/bd/` | t3.small | 20 GiB |
| `ce-back` | API, n8n y Ollama (bot de Telegram) | `aws/back/` | **t3.large** (8 GB, por Ollama) | 30 GiB |
| `ce-front` | Portal React (nginx) detrás de Caddy, que pone https | `aws/front/` | t3.small | 20 GiB |

- **https y dominio sin comprar nada:** FRONT lleva una IP elástica y [sslip.io](https://sslip.io) la convierte
  en nombre (`3.91.12.34` → `3-91-12-34.sslip.io`). Caddy saca el certificado solo. Telegram exige https.
- **Ya no hay túnel:** Telegram entra por FRONT, que reenvía `/webhook` a n8n en BACK.
- El flujo `n8n/bot-siae.json` funciona sin cambios: en BACK los servicios se llaman `api` y `ollama`, igual que en WSL.

## 0. Learner Lab
Entra al curso, abre el Learner Lab, pulsa **Start Lab** y, cuando el punto esté verde, pulsa **AWS**.
La región es **us-east-1 (Norte de Virginia)**; no la cambies. La sesión dura 4 horas: al terminar, AWS
**detiene** las instancias y las vuelve a prender cuando inicias el laboratorio. Los datos se quedan.
La llave SSH ya existe (`vockey`); el archivo `labsuser.pem` se descarga en **AWS Details → Download PEM**.

## 1. Grupos de seguridad (en este orden)
**EC2 → Red y seguridad → Security Groups → Crear grupo de seguridad.** VPC: la predeterminada. Las reglas de
salida se dejan como vienen.

| Nombre | Reglas de entrada (Tipo · Puerto · Origen) |
|---|---|
| `sg-front` | HTTP · 80 · Anywhere-IPv4 — HTTPS · 443 · Anywhere-IPv4 — SSH · 22 · Anywhere-IPv4 |
| `sg-back` | TCP personalizado · 3000 · `sg-front` — TCP personalizado · 5678 · `sg-front` — SSH · 22 · Anywhere-IPv4 |
| `sg-bd` | PostgreSQL · 5432 · `sg-back` — SSH · 22 · Anywhere-IPv4 |

Para poner otro grupo como origen, elige **Personalizado** y escribe `sg-` en el buscador.
El SSH queda abierto para que funcione el botón **Conectar** de la consola (entra con llave, no con contraseña).
Si solo usarás tu terminal, cámbialo a **Mi IP**.

## 2. IP elástica para FRONT
**Direcciones IP elásticas → Asignar la dirección IP elástica → Asignar.** Anota la IP; tu dominio será esa IP
con guiones más `.sslip.io`, por ejemplo `3-91-12-34.sslip.io`.

## 3. Lanzar las 3 instancias
**Instancias → Lanzar instancias**, una vez por cada fila de la tabla de arriba:

| Campo | Valor |
|---|---|
| Nombre | `ce-bd`, `ce-back` o `ce-front` |
| AMI | **Ubuntu Server 24.04 LTS** (64 bits x86) |
| Tipo de instancia | el de la tabla |
| Par de claves | `vockey` |
| Configuraciones de red → Editar | **Seleccionar un grupo de seguridad existente**: `sg-bd`, `sg-back` o `sg-front` |
| Configurar almacenamiento | el de la tabla, gp3 |
| Detalles avanzados → Datos de usuario | pega el contenido de [`aws/preparar-servidor.sh`](aws/preparar-servidor.sh) |

Ese script instala Docker y clona el repositorio en el primer arranque (2 o 3 minutos).

Al terminar:
1. **Direcciones IP elásticas →** selecciona la IP **→ Acciones → Asociar la dirección IP elástica →** instancia `ce-front` **→ Asociar**.
2. En **Instancias**, abre `ce-bd` y `ce-back` y anota su **Dirección IPv4 privada** (algo como `172.31.20.15`).

## 4. Entrar a cada instancia
Lo más fácil: selecciona la instancia → **Conectar → EC2 Instance Connect → Conectar** (usuario `ubuntu`).
Desde WSL también puedes:
```bash
cp "/mnt/c/Users/Luis Angel/Downloads/labsuser.pem" ~/.ssh/aws.pem && chmod 600 ~/.ssh/aws.pem
ssh -i ~/.ssh/aws.pem ubuntu@<IP pública de la instancia>
```
En cada una, antes de seguir:
```bash
cloud-init status --wait     # debe decir "status: done"
newgrp docker                # para usar docker sin sudo en esta sesión
```
Si dice `error`, revisa `sudo tail -50 /var/log/cloud-init-output.log`.

## 5. BD
```bash
cd ~/ControlEscolar-Rural/aws/bd
echo "DB_PASSWORD=$(openssl rand -hex 24)" > .env
cat .env                     # copia la clave: BACK la necesita
docker compose up -d
docker compose ps            # espera "healthy"
```
La primera vez carga `database/001_schema.sql` y `002_datos_prueba.sql`.

## 6. BACK
Cambia los valores entre `< >` (la IP privada de BD, la clave de BD y el dominio de FRONT):
```bash
cd ~/ControlEscolar-Rural/aws/back
nc -zv <IP privada de BD> 5432        # debe decir "succeeded"; si no, revisa sg-bd
cat > .env <<FIN
IP_BD=<IP privada de BD>
DB_PASSWORD=<la clave de BD>
DOMINIO=<3-91-12-34.sslip.io>
JWT_SECRET=$(openssl rand -hex 24)
BOT_API_TOKEN=$(openssl rand -hex 24)
TELEGRAM_BOT_TOKEN=
FIN
nano .env                    # pega el TELEGRAM_BOT_TOKEN de @BotFather
docker compose up -d --build
curl -s localhost:3000/api/health        # la API responde y ve la base
docker compose logs -f ollama-modelo     # espera "success" (baja ~2 GB) y sal con Ctrl+C
```

## 7. FRONT
```bash
cd ~/ControlEscolar-Rural/aws/front
curl -s https://checkip.amazonaws.com    # debe ser tu IP elástica
cat > .env <<FIN
DOMINIO=$(curl -s https://checkip.amazonaws.com | tr . -).sslip.io
IP_BACK=<IP privada de BACK>
VITE_BOT_TELEGRAM=
FIN
nc -zv <IP privada de BACK> 3000         # "succeeded"; si no, revisa sg-back
docker compose up -d --build
docker compose logs caddy | grep -i certificate   # "certificate obtained successfully"
```
Abre `https://<tu dominio>` y entra con `admin@escuela.mx` / `docente123` (o un alumno: `A260001` / `alumno123`).

## 8. Bot de Telegram
Un bot solo admite **un** webhook: antes de seguir, apaga el de WSL (`docker compose stop n8n tunel` allá).

1. El editor de n8n no está publicado. Ábrelo con un túnel SSH desde WSL (deja la terminal abierta):
   ```bash
   ssh -i ~/.ssh/aws.pem -N -L 5678:localhost:5678 ubuntu@<IP pública de BACK>
   ```
   En el navegador de Windows abre http://localhost:5678 y crea el usuario de n8n.
2. Importa `n8n/bot-siae.json` y llena las credenciales: el token de @BotFather y el `BOT_API_TOKEN` del
   `.env` **de BACK** (`grep BOT_API_TOKEN ~/ControlEscolar-Rural/aws/back/.env`). **Activa** el flujo.
   Detalles en [n8n/README.md](n8n/README.md).
3. Comprueba en BACK que Telegram apunta a FRONT:
   ```bash
   curl -s "https://api.telegram.org/bot$(grep ^TELEGRAM_BOT_TOKEN .env | cut -d= -f2)/getWebhookInfo"
   ```
   `url` debe empezar con `https://<tu dominio>/webhook/` y no tener `last_error_message`.
4. En el portal abre **Bot de Telegram**, genera el código y mándale al bot `/vincular 123456`.

Ollama corre en CPU: cada respuesta del bot tarda de 5 a 15 segundos.

## Día a día
| Para | Dónde y qué |
|---|---|
| Ver el estado | en cualquiera, dentro de su carpeta `aws/<capa>`: `docker compose ps` |
| Ver errores | BACK: `docker compose logs -f api` (o `n8n`); FRONT: `docker compose logs -f caddy` |
| Actualizar tras cambios en GitHub | en la instancia que cambió: `cd ~/ControlEscolar-Rural && git pull && cd aws/<capa> && docker compose up -d --build` |
| Respaldar la base | BD: `docker compose exec -T db pg_dump -U postgres control_escolar > ~/respaldo.sql` |

Al iniciar otra vez el laboratorio todo arranca solo (Docker habilitado y `restart: unless-stopped`). Las IP
privadas y la elástica no cambian, así que no hay que tocar ningún `.env` ni reactivar el flujo. Las IP
públicas de BACK y BD sí cambian; solo importan para entrar por SSH.

## Problemas comunes
- **El sitio no abre o no sale el certificado:** `docker compose logs caddy` en FRONT. Revisa que `DOMINIO` sea
  la IP elástica con guiones y que `sg-front` tenga el 80 y el 443.
- **El portal abre pero el login falla (502):** FRONT no llega a BACK. Prueba `nc -zv <IP BACK> 3000` desde FRONT
  y revisa `IP_BACK` y `sg-back`.
- **`/api/health` da error de base:** BACK no llega a BD o la clave no coincide. Prueba `nc -zv <IP BD> 5432`
  desde BACK y compara `DB_PASSWORD` en los dos `.env`. Si cambias la clave en BD después del primer arranque,
  no surte efecto: la base ya se creó con la anterior.
- **El bot no contesta:** `getWebhookInfo` (paso 8.3). `url` vacío = flujo inactivo; un `trycloudflare.com` = el
  flujo de WSL se activó después.
- **Si el laboratorio no deja asignar IP elástica:** usa la IP pública de FRONT en `DOMINIO`. Cambia en cada
  sesión, así que tendrás que actualizar `DOMINIO` en FRONT y BACK, correr `docker compose up -d` en ambas y
  reactivar el flujo.
- **Sin memoria en BACK:** `free -h`. Con t3.medium (4 GB) usa `OLLAMA_MODELO=qwen2.5:1.5b` en el `.env` de BACK
  y el mismo nombre en el nodo Ollama del flujo; responde peor, pero cabe.
