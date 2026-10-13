# Control Escolar Rural · Avance 1

App web para docentes: pasar lista, capturar calificaciones, ver horario y alertas de rezago.
**Funciona sin internet** y sube lo capturado en cuanto detecta conexión.

```
database/  001_schema.sql   tus 10 tablas (solo para una base NUEVA)
           002_avance1.sql  contraseña de los usuarios de prueba (corre esto en tu base actual)
backend/   API Node.js + Express, arquitectura hexagonal
frontend/  React + Vite, instalable (PWA) y offline
```

## Cómo funciona el modo sin internet
1. Al iniciar sesión (con conexión) se descargan grupos, alumnos, materias y horario.
2. La app queda guardada en el navegador (service worker): se abre aunque no haya red.
3. Cada lista o calificación se guarda en el dispositivo y entra a una cola ("N por subir").
4. Al volver la conexión (o cada 30 s, o con el botón Sincronizar) la cola se envía como un
   **lote con UUID** a `POST /api/sync/lote`. Si la red se corta y se reintenta, el servidor reconoce
   el lote en `sync_lotes` y no lo duplica.
5. Tras cada lote, la API corre `fn_generar_alertas()` y avisa por Telegram al director y al titular.
6. Sin internet, la pestaña Alertas también detecta en el dispositivo 3+ faltas seguidas.

## Arquitectura hexagonal (backend/src)
| Capa | Archivo | Qué hace |
|---|---|---|
| Dominio | `domain/registros.js` | Reglas: estados válidos, calificación 0–10, parcial 1–3 |
| Aplicación | `application/casosDeUso.js` | Iniciar sesión, catálogo, sincronizar lote, alertas |
| Adaptador entrada | `infrastructure/http/app.js` | Rutas REST con JWT |
| Adaptador salida | `infrastructure/persistence/repositorioPg.js` | PostgreSQL |
| Adaptador salida | `infrastructure/notifications/telegram.js` | Bot de Telegram |
| Arranque | `main.js` | Conecta todo (inyección de dependencias) |

## Correrlo en tu Ubuntu (WSL) con tu base de pgAdmin
```bash
cd ~ && unzip -o "/mnt/c/Users/Luis Angel/OneDrive/Escritorio/avance1.zip"   # o donde lo guardes

# 1) Base: solo el ajuste de contraseñas (no borra nada)
WIN=$(ip route show default | awk '{print $3}')
psql -h $WIN -U postgres -d control_escolar -f ~/avance1/database/002_avance1.sql

# 2) Backend (terminal 1). Detén antes el de control-escolar si sigue en el puerto 3000.
cd ~/avance1/backend && cp .env.example .env && nano .env   # pon DB_PASSWORD y JWT_SECRET
npm install && npm run dev

# 3) Frontend (terminal 2)
cd ~/avance1/frontend && npm install && npm run dev
```
Abre http://localhost:5173 y entra con `maria.docente@escuela.mx` / `docente123`.

**Probar el modo offline** (usa el build, porque el service worker no corre en `npm run dev`):
```bash
cd ~/avance1/frontend && npm run build && npm run preview   # http://localhost:4173
```
En el navegador: F12 → Network → "Offline". Pasa lista, recarga la página (sigue abriendo),
vuelve a "No throttling" y mira que "N por subir" cambie a "Todo sincronizado".
Compruébalo en pgAdmin: `SELECT * FROM asistencias ORDER BY updated_at DESC;`

## Pruebas
```bash
cd ~/avance1/backend
DB_HOST=windows DB_NAME=control_escolar DB_PASSWORD=... npm test
```
Ojo: la prueba escribe una falta (12/10/2026) y una calificación de ejemplo en la base que le indiques.

## Alertas por Telegram
1. En Telegram habla con @BotFather → `/newbot` → copia el token a `TELEGRAM_BOT_TOKEN` en `.env`.
2. Escribe a tu bot, abre `https://api.telegram.org/bot<TOKEN>/getUpdates` y copia tu `chat.id`.
3. `UPDATE usuarios SET telegram_chat_id = '<chat.id>' WHERE email = 'director@escuela.mx';`
Sin token, las alertas se imprimen en la consola del backend y quedan pendientes.

## API
| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/health` | Prueba de conexión a la base |
| POST | `/api/auth/login` | `{email, password}` → token JWT |
| GET | `/api/catalogo` | Grupos, alumnos, materias y horario del docente |
| POST | `/api/sync/lote` | `{id, dispositivo_id, asistencias[], calificaciones[]}` |
| GET | `/api/alertas` | Alertas abiertas de sus grupos |

## Siguiente avance
- Node-RED como cola local de la escuela y n8n para reglas/avisos programados (docker compose).
- Descargar al dispositivo las asistencias ya guardadas en el servidor (hoy solo se ven las capturadas en ese equipo).
- Despliegue en AWS: EC2 (PM2 + Nginx sirviendo `frontend/dist` y `/api`) y RDS (`DB_SSL=true`).
