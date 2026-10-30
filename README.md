# Control Escolar · plataforma tipo SIAE

Portal escolar para **administradores, docentes y alumnos** (calificaciones, constancias, reportes, horario) con un
**bot de Telegram** que hace lo mismo mediante un flujo de n8n con Ollama. React + Node.js sobre Ubuntu, con
arquitectura hexagonal en el backend.

> En migración. Ya está la Fase 0 (estructura nueva, sin modo offline). Las fases siguientes cambian la base a modelo
> universitario y agregan roles, constancias, reportes y el bot.

| Carpeta | Qué es |
|---|---|
| `backend/` | API Node.js + Express, arquitectura hexagonal (`domain/`, `application/`, `infrastructure/`) |
| `frontend/` | Portal web en React + Vite |
| `database/` | Scripts de PostgreSQL (`001` esquema, `002` contraseñas de prueba, `003` datos de ejemplo) |
| `legado-aspnet/` | Versión anterior en ASP.NET Core Razor Pages, ya no se desarrolla (se toma su diseño y consultas) |

## Arquitectura hexagonal (backend/src)
| Capa | Archivo | Qué hace |
|---|---|---|
| Dominio | `domain/registros.js` | Reglas: estados de asistencia válidos, calificación 0–10, parcial 1–3 |
| Aplicación | `application/casosDeUso.js` | Iniciar sesión, catálogo, guardar registros, alertas |
| Adaptador de entrada | `infrastructure/http/app.js` | Rutas REST con JWT |
| Adaptador de salida | `infrastructure/persistence/repositorioPg.js` | PostgreSQL |
| Adaptador de salida | `infrastructure/notifications/telegram.js` | Bot de Telegram |
| Arranque | `main.js` | Conecta todo (inyección de dependencias) |

## Correrlo en Ubuntu (WSL)
```bash
# 1) Base nueva: crea control_escolar y corre los scripts en orden
createdb control_escolar
for f in database/001_schema.sql database/002_avance1.sql database/003_datos_realistas.sql; do psql -d control_escolar -f $f; done

# 2) Backend (terminal 1)
cd backend && cp .env.example .env && nano .env   # DB_PASSWORD, JWT_SECRET y TELEGRAM_BOT_TOKEN
npm install && npm run dev

# 3) Frontend (terminal 2)
cd frontend && npm install && npm run dev
```
Abre http://localhost:5173 y entra con `maria.docente@escuela.mx` o `director@escuela.mx`, contraseña `docente123`
(solo para pruebas). Si tu PostgreSQL es el de Windows (pgAdmin), deja `DB_HOST=windows` en `.env`.

## Pruebas
```bash
cd backend && DB_HOST=localhost DB_PASSWORD=... npm test
```
La prueba escribe una falta (12/10/2026) y una calificación de ejemplo en la base que le indiques.

## API
| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/health` | Prueba de conexión a la base |
| POST | `/api/auth/login` | `{email, password}` → token JWT (dura 8 horas) |
| GET | `/api/catalogo` | Grupos, alumnos, materias y horario del usuario |
| POST | `/api/registros` | `{asistencias[], calificaciones[]}`; genera y avisa alertas de rezago |
| GET | `/api/alertas` | Alertas abiertas de sus grupos |
