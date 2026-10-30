# Control Escolar · plataforma tipo SIAE

Portal escolar para **administradores, docentes y alumnos** (calificaciones, constancias, reportes, horario) con un
**bot de Telegram** que hace lo mismo mediante un flujo de n8n con Ollama. React + Node.js sobre Ubuntu, con
arquitectura hexagonal en el backend.

> En migración. Listas: Fase 0 (estructura nueva, sin modo offline), Fase 1 (modelo universitario, tres roles con
> permisos, login con matrícula, kárdex) y Fase 2 (portal por rol con diseño de vidrio). Siguen constancias y reportes,
> y el bot con n8n + Ollama.

| Carpeta | Qué es |
|---|---|
| `backend/` | API Node.js + Express, arquitectura hexagonal (`domain/`, `application/`, `infrastructure/`) |
| `frontend/` | Portal web en React + Vite: `src/paginas/` una por pantalla, `src/api.js` única capa que habla con el backend |
| `database/` | PostgreSQL: `001_schema.sql` (modelo universitario) y `002_datos_prueba.sql` (facultad de ejemplo) |
| `legado-aspnet/` | Versión anterior en ASP.NET Core Razor Pages, ya no se desarrolla (se toma su diseño y consultas) |

## Portal por rol
| Rol | Pantallas |
|---|---|
| Administrador | Inicio con indicadores de la facultad, Alumnos (busca y abre calificaciones y kárdex), Pase de lista, Calificaciones, Horario por grupo, Alertas |
| Docente | Inicio con sus grupos y clases de hoy, Pase de lista y Calificaciones de las materias que imparte, Horario, Alertas |
| Alumno | Inicio con promedio y créditos, Mis calificaciones, Kárdex, Horario |

## Arquitectura hexagonal (backend/src)
| Capa | Archivo | Qué hace |
|---|---|---|
| Dominio | `domain/registros.js` | Validaciones: asistencia, calificación 0–10, parcial 1–3, matrícula o correo |
| Dominio | `domain/permisos.js` | Qué puede hacer cada rol (administrador, docente, alumno) |
| Dominio | `domain/kardex.js` | Aprobada con 6, créditos y promedio del kárdex |
| Puertos | `application/puertos.js` | Interfaces que piden los casos de uso: Repositorio, Notificador, Tokens |
| Aplicación | `application/casosDeUso.js` | Iniciar sesión, catálogo, guardar registros, calificaciones, kárdex, alertas |
| Adaptador de entrada | `infrastructure/http/app.js` | Rutas REST con JWT |
| Adaptador de salida | `infrastructure/persistence/repositorioPg.js` | PostgreSQL |
| Adaptador de salida | `infrastructure/notifications/telegram.js` | Bot de Telegram |
| Arranque | `main.js` | Conecta todo (inyección de dependencias) |

## Correrlo en Ubuntu (WSL)
```bash
# 1) Base nueva (si ya tenías control_escolar de la versión de primaria, bórrala o usa otro nombre)
createdb control_escolar
psql -d control_escolar -f database/001_schema.sql
psql -d control_escolar -f database/002_datos_prueba.sql

# 2) Backend (terminal 1)
cd backend && cp .env.example .env && nano .env   # DB_PASSWORD, JWT_SECRET y TELEGRAM_BOT_TOKEN
npm install && npm run dev

# 3) Frontend (terminal 2)
cd frontend && npm install && npm run dev
```
Abre http://localhost:5173. Usuarios de prueba (solo para pruebas):

| Rol | Usuario | Contraseña |
|---|---|---|
| Administrador | `admin@escuela.mx` | `docente123` |
| Docente | `maria.docente@escuela.mx` (Informática) y 15 más | `docente123` |
| Alumno | su matrícula, p. ej. `A260001` (192 alumnos) | `alumno123` |

Datos de prueba: Facultad de Contaduría y Administración con las licenciaturas en Contaduría, Administración,
Informática y Negocios Internacionales; grupos A de 1°, 3°, 5° y 7° en el periodo 2026-2; kárdex desde 2023-2.
Si tu PostgreSQL es el de Windows (pgAdmin), deja `DB_HOST=windows` en `.env`.

## Pruebas
```bash
cd backend && npm test                                  # dominio y casos de uso, sin base
cd backend && DB_HOST=localhost DB_PASSWORD=... npm test  # además, la API contra PostgreSQL
```
La prueba con base escribe una falta (12/10/2026) y un 3er parcial de ejemplo en la base que le indiques.

## API
| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/health` | Prueba de conexión a la base |
| POST | `/api/auth/login` | `{usuario, password}` (correo o matrícula) → token JWT de 8 horas |
| GET | `/api/catalogo` | Grupos, alumnos, materias y horario que le tocan a cada rol en el periodo en curso |
| GET | `/api/registros?grupo_id=&materia_id=&fecha=&parcial=` | Lista de esa fecha y calificaciones de ese parcial ya capturadas en una clase |
| POST | `/api/registros` | `{asistencias[], calificaciones[]}`; administrador, o docente en sus materias |
| GET | `/api/calificaciones?alumno_id=` | Parciales del periodo (el alumno ve solo los suyos; el docente, sus materias) |
| GET | `/api/kardex?alumno_id=` | Kárdex con créditos y promedio (administrador o el propio alumno) |
| GET | `/api/alertas` | Alertas abiertas de sus grupos (administrador y docente) |

Sin permiso, la API responde 403.
