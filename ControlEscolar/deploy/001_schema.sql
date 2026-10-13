-- =====================================================================
--  Sistema de Control Escolar para Escuelas Rurales
--  Script de prueba - PostgreSQL 13+
--  Crea la BD, tablas, reglas, datos de ejemplo y consultas de rezago
-- =====================================================================

-- 1) Crear la base de datos (ejecutar como usuario postgres)
-- DROP DATABASE IF EXISTS control_escolar_db;
-- CREATE DATABASE control_escolar_db;
-- \c control_escolar_db

-- Solo para una base NUEVA. Si ya tienes control_escolar en pgAdmin, NO lo corras:
-- usa únicamente 002_avance1.sql. (Se quitaron las líneas DROP SCHEMA para no borrar datos.)

-- =====================================================================
-- 2) Tipos enumerados
-- =====================================================================
CREATE TYPE rol_usuario      AS ENUM ('docente', 'director', 'admin');
CREATE TYPE estado_asistencia AS ENUM ('presente', 'falta', 'retardo', 'justificada');
CREATE TYPE nivel_alerta     AS ENUM ('amarilla', 'roja');
CREATE TYPE tipo_alerta      AS ENUM ('faltas_consecutivas', 'inasistencia_mensual', 'bajo_promedio');
CREATE TYPE dia_semana       AS ENUM ('lunes', 'martes', 'miercoles', 'jueves', 'viernes');

-- =====================================================================
-- 3) Función para actualizar updated_at (necesaria para sincronizar)
-- =====================================================================
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 4) Tablas
--    Todas usan UUID (se pueden generar en el celular sin internet)
--    y updated_at para resolver conflictos (last-write-wins).
-- =====================================================================

CREATE TABLE escuelas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave_cct   VARCHAR(15)  NOT NULL UNIQUE,      -- Clave de Centro de Trabajo
    nombre      VARCHAR(150) NOT NULL,
    municipio   VARCHAR(80)  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE usuarios (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escuela_id        UUID NOT NULL REFERENCES escuelas(id),
    nombre            VARCHAR(120) NOT NULL,
    email             VARCHAR(120) NOT NULL UNIQUE,
    password_hash     VARCHAR(255) NOT NULL,         -- bcrypt
    rol               rol_usuario  NOT NULL DEFAULT 'docente',
    telegram_chat_id  VARCHAR(30),                   -- para recibir alertas
    activo            BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE grupos (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escuela_id   UUID NOT NULL REFERENCES escuelas(id),
    grado        SMALLINT    NOT NULL CHECK (grado BETWEEN 1 AND 6),
    letra        CHAR(1)     NOT NULL,
    ciclo        VARCHAR(9)  NOT NULL,              -- '2026-2027'
    docente_id   UUID REFERENCES usuarios(id),      -- docente titular
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (escuela_id, grado, letra, ciclo)
);

CREATE TABLE alumnos (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_id           UUID NOT NULL REFERENCES grupos(id),
    curp               VARCHAR(18)  UNIQUE,
    nombre             VARCHAR(120) NOT NULL,
    tutor_nombre       VARCHAR(120),
    tutor_telefono     VARCHAR(15),
    tutor_telegram_id  VARCHAR(30),
    activo             BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE materias (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escuela_id  UUID NOT NULL REFERENCES escuelas(id),
    nombre      VARCHAR(80) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (escuela_id, nombre)
);

CREATE TABLE horarios (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_id     UUID NOT NULL REFERENCES grupos(id),
    materia_id   UUID NOT NULL REFERENCES materias(id),
    docente_id   UUID NOT NULL REFERENCES usuarios(id),
    dia          dia_semana NOT NULL,
    hora_inicio  TIME NOT NULL,
    hora_fin     TIME NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (hora_fin > hora_inicio)
);

CREATE TABLE asistencias (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id        UUID NOT NULL REFERENCES alumnos(id),
    docente_id       UUID NOT NULL REFERENCES usuarios(id),
    fecha            DATE NOT NULL,
    estado           estado_asistencia NOT NULL,
    observacion      VARCHAR(200),
    dispositivo_id   VARCHAR(60),                    -- de qué equipo vino
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (alumno_id, fecha)                        -- una lista por día
);

CREATE TABLE calificaciones (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id    UUID NOT NULL REFERENCES alumnos(id),
    materia_id   UUID NOT NULL REFERENCES materias(id),
    docente_id   UUID NOT NULL REFERENCES usuarios(id),
    parcial      SMALLINT     NOT NULL CHECK (parcial BETWEEN 1 AND 3),
    calificacion NUMERIC(4,2) NOT NULL CHECK (calificacion BETWEEN 0 AND 10),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (alumno_id, materia_id, parcial)
);

CREATE TABLE alertas_rezago (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id    UUID NOT NULL REFERENCES alumnos(id),
    tipo         tipo_alerta  NOT NULL,
    nivel        nivel_alerta NOT NULL,
    detalle      VARCHAR(250),
    enviada      BOOLEAN      NOT NULL DEFAULT FALSE,  -- ya se mandó por Telegram
    enviada_at   TIMESTAMPTZ,
    atendida     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Bitácora de lotes recibidos desde Node-RED / PWA (idempotencia)
CREATE TABLE sync_lotes (
    id              UUID PRIMARY KEY,                 -- lo genera el cliente
    dispositivo_id  VARCHAR(60) NOT NULL,
    usuario_id      UUID REFERENCES usuarios(id),
    total_registros INTEGER     NOT NULL DEFAULT 0,
    recibido_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 5) Triggers de updated_at
-- =====================================================================
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['escuelas','usuarios','grupos','alumnos','materias',
                             'horarios','asistencias','calificaciones','alertas_rezago']
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON %1$s
             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();', t);
    END LOOP;
END $$;

-- =====================================================================
-- 6) Índices para consultas frecuentes y sincronización
-- =====================================================================
CREATE INDEX idx_alumnos_grupo         ON alumnos(grupo_id);
CREATE INDEX idx_asistencias_fecha     ON asistencias(fecha);
CREATE INDEX idx_asistencias_updated   ON asistencias(updated_at);
CREATE INDEX idx_calificaciones_alumno ON calificaciones(alumno_id);
CREATE INDEX idx_alertas_pendientes    ON alertas_rezago(enviada) WHERE enviada = FALSE;

-- =====================================================================
-- 7) Vistas de rezago (las usa n8n / la API para generar alertas)
-- =====================================================================

-- % de inasistencia del mes actual por alumno
CREATE VIEW v_inasistencia_mensual AS
SELECT a.id AS alumno_id,
       a.nombre,
       COUNT(s.*)                                         AS dias_registrados,
       COUNT(s.*) FILTER (WHERE s.estado = 'falta')       AS faltas,
       ROUND(100.0 * COUNT(s.*) FILTER (WHERE s.estado = 'falta')
             / NULLIF(COUNT(s.*), 0), 1)                  AS porcentaje_faltas
FROM alumnos a
JOIN asistencias s ON s.alumno_id = a.id
WHERE date_trunc('month', s.fecha) = date_trunc('month', CURRENT_DATE)
GROUP BY a.id, a.nombre;

-- Racha de faltas consecutivas más reciente (últimos registros)
CREATE VIEW v_faltas_consecutivas AS
WITH ordenadas AS (
    SELECT alumno_id, fecha, estado,
           ROW_NUMBER() OVER (PARTITION BY alumno_id ORDER BY fecha DESC) AS rn
    FROM asistencias
),
corte AS (   -- primer día (desde hoy hacia atrás) que NO fue falta
    SELECT alumno_id, MIN(rn) AS primer_no_falta
    FROM ordenadas
    WHERE estado <> 'falta'
    GROUP BY alumno_id
)
SELECT o.alumno_id,
       al.nombre,
       COUNT(*) AS faltas_seguidas
FROM ordenadas o
JOIN alumnos al ON al.id = o.alumno_id
LEFT JOIN corte c ON c.alumno_id = o.alumno_id
WHERE o.rn < COALESCE(c.primer_no_falta, 999999)
GROUP BY o.alumno_id, al.nombre;

-- Promedio por alumno
CREATE VIEW v_promedios AS
SELECT a.id AS alumno_id, a.nombre,
       ROUND(AVG(c.calificacion), 2) AS promedio
FROM alumnos a
JOIN calificaciones c ON c.alumno_id = a.id
GROUP BY a.id, a.nombre;

-- =====================================================================
-- 8) Función que genera alertas según las reglas de rezago
--    Reglas: 3+ faltas seguidas (amarilla), >20% faltas en el mes (roja),
--    promedio < 6 (roja)
-- =====================================================================
CREATE OR REPLACE FUNCTION fn_generar_alertas()
RETURNS INTEGER AS $$
DECLARE nuevas INTEGER := 0; n INTEGER;
BEGIN
    INSERT INTO alertas_rezago (alumno_id, tipo, nivel, detalle)
    SELECT alumno_id, 'faltas_consecutivas', 'amarilla',
           faltas_seguidas || ' faltas consecutivas'
    FROM v_faltas_consecutivas v
    WHERE faltas_seguidas >= 3
      AND NOT EXISTS (SELECT 1 FROM alertas_rezago r
                      WHERE r.alumno_id = v.alumno_id
                        AND r.tipo = 'faltas_consecutivas' AND r.atendida = FALSE);
    GET DIAGNOSTICS n = ROW_COUNT; nuevas := nuevas + n;

    INSERT INTO alertas_rezago (alumno_id, tipo, nivel, detalle)
    SELECT alumno_id, 'inasistencia_mensual', 'roja',
           porcentaje_faltas || '% de inasistencia en el mes'
    FROM v_inasistencia_mensual v
    WHERE porcentaje_faltas > 20
      AND NOT EXISTS (SELECT 1 FROM alertas_rezago r
                      WHERE r.alumno_id = v.alumno_id
                        AND r.tipo = 'inasistencia_mensual' AND r.atendida = FALSE);
    GET DIAGNOSTICS n = ROW_COUNT; nuevas := nuevas + n;

    INSERT INTO alertas_rezago (alumno_id, tipo, nivel, detalle)
    SELECT alumno_id, 'bajo_promedio', 'roja', 'Promedio de ' || promedio
    FROM v_promedios v
    WHERE promedio < 6
      AND NOT EXISTS (SELECT 1 FROM alertas_rezago r
                      WHERE r.alumno_id = v.alumno_id
                        AND r.tipo = 'bajo_promedio' AND r.atendida = FALSE);
    GET DIAGNOSTICS n = ROW_COUNT; nuevas := nuevas + n;

    RETURN nuevas;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 9) Datos de prueba
-- =====================================================================
INSERT INTO escuelas (id, clave_cct, nombre, municipio) VALUES
 ('11111111-1111-1111-1111-111111111111', '07DPR0001A', 'Esc. Prim. Benito Juárez', 'Berriozábal');

INSERT INTO usuarios (id, escuela_id, nombre, email, password_hash, rol, telegram_chat_id) VALUES
 ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111',
  'María López Pérez', 'maria.docente@escuela.mx', '$2b$10$hashdeprueba', 'docente', '123456789'),
 ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
  'Jorge Ruiz Gómez', 'director@escuela.mx', '$2b$10$hashdeprueba', 'director', '987654321');

INSERT INTO grupos (id, escuela_id, grado, letra, ciclo, docente_id) VALUES
 ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111',
  4, 'A', '2026-2027', '22222222-2222-2222-2222-222222222221');

INSERT INTO materias (id, escuela_id, nombre) VALUES
 ('44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', 'Español'),
 ('44444444-4444-4444-4444-444444444442', '11111111-1111-1111-1111-111111111111', 'Matemáticas');

INSERT INTO alumnos (id, grupo_id, curp, nombre, tutor_nombre, tutor_telefono) VALUES
 ('55555555-5555-5555-5555-555555555551', '33333333-3333-3333-3333-333333333331',
  'GOHA160512HCSMRN01', 'Ana Gómez Hernández',  'Rosa Hernández', '9611111111'),
 ('55555555-5555-5555-5555-555555555552', '33333333-3333-3333-3333-333333333331',
  'PELC160803HCSRPR02', 'Carlos Pérez López',   'Juan Pérez',     '9612222222'),
 ('55555555-5555-5555-5555-555555555553', '33333333-3333-3333-3333-333333333331',
  'MADL160120MCSRZS03', 'Lucía Martínez Díaz',  'Elena Díaz',     '9613333333');

INSERT INTO horarios (grupo_id, materia_id, docente_id, dia, hora_inicio, hora_fin) VALUES
 ('33333333-3333-3333-3333-333333333331', '44444444-4444-4444-4444-444444444441',
  '22222222-2222-2222-2222-222222222221', 'lunes', '08:00', '09:00'),
 ('33333333-3333-3333-3333-333333333331', '44444444-4444-4444-4444-444444444442',
  '22222222-2222-2222-2222-222222222221', 'lunes', '09:00', '10:00');

-- Asistencia de los últimos 5 días (Carlos acumula faltas seguidas)
INSERT INTO asistencias (alumno_id, docente_id, fecha, estado, dispositivo_id)
SELECT al.id, '22222222-2222-2222-2222-222222222221', d::date,
       CASE WHEN al.nombre LIKE 'Carlos%' AND d >= CURRENT_DATE - 3 THEN 'falta'
            ELSE 'presente' END::estado_asistencia,
       'tablet-4A'
FROM alumnos al
CROSS JOIN generate_series(CURRENT_DATE - 4, CURRENT_DATE, interval '1 day') AS d;

-- Calificaciones del primer parcial (Lucía con bajo promedio)
INSERT INTO calificaciones (alumno_id, materia_id, docente_id, parcial, calificacion) VALUES
 ('55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444441', '22222222-2222-2222-2222-222222222221', 1, 9.0),
 ('55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444442', '22222222-2222-2222-2222-222222222221', 1, 8.5),
 ('55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444441', '22222222-2222-2222-2222-222222222221', 1, 7.0),
 ('55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444442', '22222222-2222-2222-2222-222222222221', 1, 6.5),
 ('55555555-5555-5555-5555-555555555553', '44444444-4444-4444-4444-444444444441', '22222222-2222-2222-2222-222222222221', 1, 5.0),
 ('55555555-5555-5555-5555-555555555553', '44444444-4444-4444-4444-444444444442', '22222222-2222-2222-2222-222222222221', 1, 5.5);

-- =====================================================================
-- 10) Pruebas
-- =====================================================================

-- a) Simular sincronización: el mismo registro llega 2 veces (no duplica)
INSERT INTO asistencias (alumno_id, docente_id, fecha, estado, dispositivo_id)
VALUES ('55555555-5555-5555-5555-555555555551', '22222222-2222-2222-2222-222222222221',
        CURRENT_DATE, 'retardo', 'celular-maria')
ON CONFLICT (alumno_id, fecha)
DO UPDATE SET estado = EXCLUDED.estado,
              dispositivo_id = EXCLUDED.dispositivo_id
WHERE asistencias.updated_at < NOW();   -- last-write-wins

-- b) Generar alertas
SELECT fn_generar_alertas() AS alertas_nuevas;

-- c) Ver resultados
SELECT * FROM v_faltas_consecutivas;
SELECT * FROM v_promedios ORDER BY promedio;
SELECT al.nombre, r.tipo, r.nivel, r.detalle, r.enviada
FROM alertas_rezago r JOIN alumnos al ON al.id = r.alumno_id
ORDER BY r.nivel DESC;

-- d) Alertas pendientes de enviar por Telegram (lo que consultaría n8n)
SELECT r.id, al.nombre, r.detalle, u.telegram_chat_id AS enviar_a
FROM alertas_rezago r
JOIN alumnos al ON al.id = r.alumno_id
JOIN grupos  g  ON g.id  = al.grupo_id
JOIN usuarios u ON u.escuela_id = g.escuela_id AND u.rol = 'director'
WHERE r.enviada = FALSE;
