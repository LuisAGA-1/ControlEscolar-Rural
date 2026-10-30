-- =====================================================================
--  Plataforma escolar tipo SIAE · Esquema universitario · PostgreSQL 14+
--  Carreras, periodos, materias por semestre, grupos, kárdex, constancias
--  y vinculación con Telegram. Solo para una base NUEVA (no borra nada).
--
--  createdb control_escolar
--  psql -d control_escolar -f 001_schema.sql
--  psql -d control_escolar -f 002_datos_prueba.sql
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid() en PostgreSQL < 13

-- =====================================================================
-- 1) Tipos enumerados
-- =====================================================================
CREATE TYPE rol_usuario       AS ENUM ('administrador', 'docente', 'alumno');
CREATE TYPE estado_asistencia AS ENUM ('presente', 'falta', 'retardo', 'justificada');
CREATE TYPE nivel_alerta      AS ENUM ('amarilla', 'roja');
CREATE TYPE tipo_alerta       AS ENUM ('faltas_consecutivas', 'inasistencia_mensual', 'bajo_promedio');
CREATE TYPE dia_semana        AS ENUM ('lunes', 'martes', 'miercoles', 'jueves', 'viernes');
CREATE TYPE tipo_evaluacion   AS ENUM ('ordinario', 'extraordinario');
CREATE TYPE tipo_constancia   AS ENUM ('estudios', 'calificaciones');

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 2) Catálogos
-- =====================================================================
CREATE TABLE escuelas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave       VARCHAR(15)  NOT NULL UNIQUE,
    nombre      VARCHAR(150) NOT NULL,          -- facultad o universidad
    municipio   VARCHAR(80)  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE carreras (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escuela_id  UUID NOT NULL REFERENCES escuelas(id),
    clave       VARCHAR(10)  NOT NULL UNIQUE,   -- 'LINF'
    nombre      VARCHAR(120) NOT NULL,
    semestres   SMALLINT     NOT NULL CHECK (semestres BETWEEN 1 AND 12),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE periodos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave       VARCHAR(7)  NOT NULL UNIQUE,    -- '2026-2' = agosto a diciembre
    inicio      DATE        NOT NULL,
    fin         DATE        NOT NULL,
    activo      BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (fin > inicio)
);
CREATE UNIQUE INDEX uq_periodo_activo ON periodos (activo) WHERE activo;  -- solo uno en curso

CREATE TABLE usuarios (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escuela_id        UUID NOT NULL REFERENCES escuelas(id),
    nombre            VARCHAR(120) NOT NULL,
    email             VARCHAR(120) NOT NULL UNIQUE,
    password_hash     VARCHAR(255) NOT NULL,      -- bcrypt
    rol               rol_usuario  NOT NULL,
    telegram_chat_id  VARCHAR(30)  UNIQUE,        -- un chat = una persona
    activo            BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE materias (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carrera_id  UUID NOT NULL REFERENCES carreras(id),
    clave       VARCHAR(12)  NOT NULL UNIQUE,     -- 'LINF-3-1'
    nombre      VARCHAR(100) NOT NULL,
    semestre    SMALLINT     NOT NULL CHECK (semestre BETWEEN 1 AND 12),
    creditos    SMALLINT     NOT NULL CHECK (creditos > 0),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE grupos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carrera_id  UUID NOT NULL REFERENCES carreras(id),
    periodo_id  UUID NOT NULL REFERENCES periodos(id),
    semestre    SMALLINT NOT NULL CHECK (semestre BETWEEN 1 AND 12),
    letra       CHAR(1)  NOT NULL,
    tutor_id    UUID REFERENCES usuarios(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (carrera_id, periodo_id, semestre, letra)
);

CREATE TABLE alumnos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID NOT NULL UNIQUE REFERENCES usuarios(id),   -- su cuenta (rol alumno)
    matricula   VARCHAR(10) NOT NULL UNIQUE,                    -- 'A260001'
    carrera_id  UUID NOT NULL REFERENCES carreras(id),
    grupo_id    UUID REFERENCES grupos(id),                     -- grupo del periodo en curso
    semestre    SMALLINT NOT NULL CHECK (semestre BETWEEN 1 AND 12),
    curp        VARCHAR(18) UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Una fila = una sesión semanal de una materia en un grupo (carga del docente).
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

-- =====================================================================
-- 3) Registros escolares
-- =====================================================================
CREATE TABLE asistencias (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id    UUID NOT NULL REFERENCES alumnos(id),
    materia_id   UUID NOT NULL REFERENCES materias(id),
    docente_id   UUID NOT NULL REFERENCES usuarios(id),
    fecha        DATE NOT NULL,
    estado       estado_asistencia NOT NULL,
    observacion  VARCHAR(200),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (alumno_id, materia_id, fecha)           -- una lista por clase y día
);

-- Parciales del periodo.
CREATE TABLE calificaciones (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id     UUID NOT NULL REFERENCES alumnos(id),
    materia_id    UUID NOT NULL REFERENCES materias(id),
    periodo_id    UUID NOT NULL REFERENCES periodos(id),
    docente_id    UUID NOT NULL REFERENCES usuarios(id),
    parcial       SMALLINT     NOT NULL CHECK (parcial BETWEEN 1 AND 3),
    calificacion  NUMERIC(4,2) NOT NULL CHECK (calificacion BETWEEN 0 AND 10),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (alumno_id, materia_id, periodo_id, parcial)
);

-- Calificación final de cada materia cursada: de aquí sale el kárdex.
CREATE TABLE calificaciones_finales (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id     UUID NOT NULL REFERENCES alumnos(id),
    materia_id    UUID NOT NULL REFERENCES materias(id),
    periodo_id    UUID NOT NULL REFERENCES periodos(id),
    tipo          tipo_evaluacion NOT NULL DEFAULT 'ordinario',
    calificacion  NUMERIC(4,2) NOT NULL CHECK (calificacion BETWEEN 0 AND 10),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (alumno_id, materia_id, periodo_id, tipo)
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

CREATE TABLE constancias (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio                VARCHAR(20) NOT NULL UNIQUE,
    alumno_id            UUID NOT NULL REFERENCES alumnos(id),
    tipo                 tipo_constancia NOT NULL,
    emitida_por          UUID NOT NULL REFERENCES usuarios(id),
    codigo_verificacion  VARCHAR(16) NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Código de 6 dígitos que el usuario genera en el portal y manda al bot.
CREATE TABLE vinculaciones_telegram (
    usuario_id  UUID PRIMARY KEY REFERENCES usuarios(id),
    codigo      CHAR(6)     NOT NULL,
    expira_at   TIMESTAMPTZ NOT NULL
);

-- =====================================================================
-- 4) Triggers e índices
-- =====================================================================
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['escuelas','carreras','periodos','usuarios','materias','grupos','alumnos',
                             'horarios','asistencias','calificaciones','calificaciones_finales','alertas_rezago']
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON %1$s
             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();', t);
    END LOOP;
END $$;

CREATE INDEX idx_alumnos_grupo         ON alumnos(grupo_id);
CREATE INDEX idx_horarios_docente      ON horarios(docente_id);
CREATE INDEX idx_horarios_grupo        ON horarios(grupo_id);
CREATE INDEX idx_asistencias_alumno    ON asistencias(alumno_id, fecha);
CREATE INDEX idx_calificaciones_alumno ON calificaciones(alumno_id);
CREATE INDEX idx_finales_alumno        ON calificaciones_finales(alumno_id);
CREATE INDEX idx_alertas_pendientes    ON alertas_rezago(enviada) WHERE enviada = FALSE;

-- =====================================================================
-- 5) Vistas
-- =====================================================================

-- Kárdex: la mejor calificación final de cada materia cursada (ordinario o extraordinario).
CREATE VIEW v_kardex AS
SELECT DISTINCT ON (f.alumno_id, f.materia_id)
       f.alumno_id, m.id AS materia_id, m.clave, m.nombre AS materia, m.semestre, m.creditos,
       p.clave AS periodo, f.tipo, f.calificacion, f.calificacion >= 6 AS aprobada
  FROM calificaciones_finales f
  JOIN materias m ON m.id = f.materia_id
  JOIN periodos p ON p.id = f.periodo_id
 ORDER BY f.alumno_id, f.materia_id, f.calificacion DESC;

-- % de inasistencia del mes actual por alumno (todas sus clases)
CREATE VIEW v_inasistencia_mensual AS
SELECT s.alumno_id,
       COUNT(*)                                    AS clases_registradas,
       COUNT(*) FILTER (WHERE s.estado = 'falta')  AS faltas,
       ROUND(100.0 * COUNT(*) FILTER (WHERE s.estado = 'falta') / COUNT(*), 1) AS porcentaje_faltas
  FROM asistencias s
 WHERE date_trunc('month', s.fecha) = date_trunc('month', CURRENT_DATE)
 GROUP BY s.alumno_id;

-- Racha de faltas más reciente (clases seguidas, de cualquier materia)
CREATE VIEW v_faltas_consecutivas AS
WITH ordenadas AS (
    SELECT alumno_id, estado,
           ROW_NUMBER() OVER (PARTITION BY alumno_id ORDER BY fecha DESC, materia_id) AS rn
      FROM asistencias
),
corte AS (
    SELECT alumno_id, MIN(rn) AS primer_no_falta
      FROM ordenadas WHERE estado <> 'falta' GROUP BY alumno_id
)
SELECT o.alumno_id, COUNT(*) AS faltas_seguidas
  FROM ordenadas o
  LEFT JOIN corte c ON c.alumno_id = o.alumno_id
 WHERE o.rn < COALESCE(c.primer_no_falta, 999999)
 GROUP BY o.alumno_id;

-- Promedio de parciales del periodo en curso
CREATE VIEW v_promedios AS
SELECT c.alumno_id, ROUND(AVG(c.calificacion), 2) AS promedio
  FROM calificaciones c
  JOIN periodos p ON p.id = c.periodo_id AND p.activo
 GROUP BY c.alumno_id;

-- =====================================================================
-- 6) Alertas de rezago
--    3+ faltas seguidas (amarilla), >20% de faltas en el mes (roja), promedio < 6 (roja)
-- =====================================================================
CREATE OR REPLACE FUNCTION fn_generar_alertas()
RETURNS INTEGER AS $$
DECLARE nuevas INTEGER := 0; n INTEGER;
BEGIN
    INSERT INTO alertas_rezago (alumno_id, tipo, nivel, detalle)
    SELECT alumno_id, 'faltas_consecutivas', 'amarilla', faltas_seguidas || ' faltas consecutivas'
      FROM v_faltas_consecutivas v
     WHERE faltas_seguidas >= 3
       AND NOT EXISTS (SELECT 1 FROM alertas_rezago r WHERE r.alumno_id = v.alumno_id
                          AND r.tipo = 'faltas_consecutivas' AND NOT r.atendida);
    GET DIAGNOSTICS n = ROW_COUNT; nuevas := nuevas + n;

    INSERT INTO alertas_rezago (alumno_id, tipo, nivel, detalle)
    SELECT alumno_id, 'inasistencia_mensual', 'roja', porcentaje_faltas || '% de inasistencia en el mes'
      FROM v_inasistencia_mensual v
     WHERE porcentaje_faltas > 20
       AND NOT EXISTS (SELECT 1 FROM alertas_rezago r WHERE r.alumno_id = v.alumno_id
                          AND r.tipo = 'inasistencia_mensual' AND NOT r.atendida);
    GET DIAGNOSTICS n = ROW_COUNT; nuevas := nuevas + n;

    INSERT INTO alertas_rezago (alumno_id, tipo, nivel, detalle)
    SELECT alumno_id, 'bajo_promedio', 'roja', 'Promedio de ' || promedio
      FROM v_promedios v
     WHERE promedio < 6
       AND NOT EXISTS (SELECT 1 FROM alertas_rezago r WHERE r.alumno_id = v.alumno_id
                          AND r.tipo = 'bajo_promedio' AND NOT r.atendida);
    GET DIAGNOSTICS n = ROW_COUNT; nuevas := nuevas + n;

    RETURN nuevas;
END;
$$ LANGUAGE plpgsql;
