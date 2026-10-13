# Sistema de control escolar para escuelas rurales

Horario docente, pase de lista, calificaciones y alertas de rezago (con avisos por Telegram) para primarias rurales de Berriozábal, Suchiapa y Ocozocoautla, Chiapas.

| Carpeta | Qué es |
|---|---|
| `ControlEscolar/` | Aplicación web principal: ASP.NET Core 8 Razor Pages + PostgreSQL (Npgsql) |
| `ControlEscolar/deploy/` | Scripts de la base (`001`–`003`) y despliegue en AWS EC2 + RDS ([guía](ControlEscolar/deploy/GUIA-DESPLIEGUE.md)) |
| `avance1-react-node/` | Primer avance: PWA offline en React + API Node.js con arquitectura hexagonal |

## Correr en local

1. Crea la base `control_escolar` en PostgreSQL y ejecuta, en orden, `ControlEscolar/deploy/001_schema.sql`, `002_avance1.sql` y `003_datos_realistas.sql` (12 grupos, 15 docentes, 171 alumnos de ejemplo).
2. Copia `ControlEscolar/appsettings.ejemplo.json` como `appsettings.json` y pon tu contraseña de PostgreSQL (y el token del bot si quieres avisos).
3. Abre `ControlEscolar.sln` en Visual Studio y presiona F5, o `dotnet run --project ControlEscolar`.

Usuarios de prueba: `director@escuela.mx` o `maria.docente@escuela.mx`, contraseña `docente123` (solo para pruebas).

## Funciones

- Inicio con indicadores, tendencia de asistencia y estado del pase de lista por grupo.
- Pase de lista y captura de calificaciones por grupo, con validación en navegador y servidor.
- Horario semanal por grupo o por docente.
- Alertas de rezago (faltas seguidas, inasistencia mensual, bajo promedio) avisadas por Telegram.
- Cada docente solo ve sus grupos; la dirección ve toda la escuela.
