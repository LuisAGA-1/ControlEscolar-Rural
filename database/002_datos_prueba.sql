-- =====================================================================
--  002_datos_prueba.sql · Facultad de prueba, periodo 2026-2 (agosto a diciembre)
--  4 licenciaturas, 112 materias, 16 docentes, 16 grupos (1°, 3°, 5° y 7° semestre),
--  192 alumnos con cuenta, kárdex desde 2023-2, parciales 1 y 2, y asistencia por clase.
--
--  Contraseñas (solo pruebas): administrador y docentes docente123 · alumnos alumno123
--    admin@escuela.mx · maria.docente@escuela.mx · alumnos: entran con su matrícula
--  Resultado fijo: mismo contenido en cualquier computadora. Correr una vez sobre 001.
-- =====================================================================
BEGIN;

-- Número pseudoaleatorio fijo en [0, 1) e id fijo a partir de un texto
CREATE FUNCTION pg_temp.azar(t text) RETURNS double precision LANGUAGE sql IMMUTABLE AS
$$ SELECT ('x' || lpad(substr(md5(t), 1, 8), 16, '0'))::bit(64)::bigint / 4294967296.0 $$;
CREATE FUNCTION pg_temp.uid(t text) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$ SELECT md5(t)::uuid $$;

INSERT INTO escuelas (id, clave, nombre, municipio) VALUES
  ('11111111-1111-1111-1111-111111111111', 'FCA-C1', 'Facultad de Contaduría y Administración', 'Tuxtla Gutiérrez');

INSERT INTO carreras (id, escuela_id, clave, nombre, semestres)
SELECT pg_temp.uid('carrera-' || c), '11111111-1111-1111-1111-111111111111', c, n, 9
  FROM (VALUES ('LCON', 'Licenciatura en Contaduría'),
               ('LADM', 'Licenciatura en Administración'),
               ('LINF', 'Licenciatura en Informática'),
               ('LNI',  'Licenciatura en Negocios Internacionales')) AS v(c, n);

INSERT INTO periodos (id, clave, inicio, fin, activo)
SELECT pg_temp.uid('periodo-' || c), c, i::date, f::date, c = '2026-2'
  FROM (VALUES ('2023-2', '2023-08-07', '2023-12-08'), ('2024-1', '2024-01-15', '2024-06-07'),
               ('2024-2', '2024-08-05', '2024-12-06'), ('2025-1', '2025-01-13', '2025-06-06'),
               ('2025-2', '2025-08-11', '2025-12-12'), ('2026-1', '2026-01-12', '2026-06-05'),
               ('2026-2', '2026-08-10', '2026-12-11')) AS v(c, i, f);

-- Plan de estudios: 4 materias por semestre, del 1° al 7°
CREATE TEMP TABLE plan (carrera text, semestre int, n int, nombre text);
INSERT INTO plan
SELECT c, s, ord::int, m
  FROM (VALUES
  ('LCON',1,ARRAY['Contabilidad Básica','Matemáticas Financieras I','Introducción al Derecho','Fundamentos de Administración']),
  ('LCON',2,ARRAY['Contabilidad Intermedia','Matemáticas Financieras II','Derecho Mercantil','Microeconomía']),
  ('LCON',3,ARRAY['Contabilidad de Sociedades','Estadística Descriptiva','Derecho Fiscal','Macroeconomía']),
  ('LCON',4,ARRAY['Contabilidad de Costos I','Estadística Inferencial','Impuestos a Personas Morales','Derecho Laboral']),
  ('LCON',5,ARRAY['Contabilidad de Costos II','Auditoría I','Impuestos a Personas Físicas','Finanzas I']),
  ('LCON',6,ARRAY['Contabilidad Gubernamental','Auditoría II','Seguridad Social','Finanzas II']),
  ('LCON',7,ARRAY['Auditoría Fiscal','Planeación Fiscal','Presupuestos','Sistemas de Información Contable']),
  ('LADM',1,ARRAY['Teoría de la Administración','Matemáticas Básicas','Contabilidad General','Metodología de la Investigación']),
  ('LADM',2,ARRAY['Proceso Administrativo','Matemáticas para los Negocios','Contabilidad de Costos','Microeconomía']),
  ('LADM',3,ARRAY['Administración de Recursos Humanos I','Estadística I','Mercadotecnia I','Macroeconomía']),
  ('LADM',4,ARRAY['Administración de Recursos Humanos II','Estadística II','Mercadotecnia II','Derecho Laboral']),
  ('LADM',5,ARRAY['Administración Financiera I','Investigación de Operaciones','Comportamiento Organizacional','Administración de la Producción I']),
  ('LADM',6,ARRAY['Administración Financiera II','Desarrollo Organizacional','Administración de la Producción II','Derecho Mercantil']),
  ('LADM',7,ARRAY['Planeación Estratégica','Formulación de Proyectos de Inversión','Administración de la Calidad','Emprendimiento']),
  ('LINF',1,ARRAY['Fundamentos de Programación','Matemáticas Discretas','Introducción a la Informática','Contabilidad General']),
  ('LINF',2,ARRAY['Programación Estructurada','Álgebra Lineal','Arquitectura de Computadoras','Administración General']),
  ('LINF',3,ARRAY['Programación Orientada a Objetos','Estructuras de Datos','Sistemas Operativos','Probabilidad y Estadística']),
  ('LINF',4,ARRAY['Bases de Datos I','Análisis y Diseño de Sistemas','Redes de Computadoras I','Investigación de Operaciones']),
  ('LINF',5,ARRAY['Bases de Datos II','Ingeniería de Software','Redes de Computadoras II','Programación Web']),
  ('LINF',6,ARRAY['Desarrollo de Aplicaciones Móviles','Seguridad Informática','Sistemas de Información Gerencial','Inteligencia Artificial']),
  ('LINF',7,ARRAY['Administración de Proyectos de TI','Auditoría Informática','Cómputo en la Nube','Inteligencia de Negocios']),
  ('LNI',1,ARRAY['Introducción a los Negocios Internacionales','Matemáticas Básicas','Contabilidad General','Inglés I']),
  ('LNI',2,ARRAY['Comercio Internacional','Microeconomía','Derecho Internacional Público','Inglés II']),
  ('LNI',3,ARRAY['Economía Internacional','Estadística','Mercadotecnia Internacional','Inglés III']),
  ('LNI',4,ARRAY['Logística Internacional','Finanzas Internacionales','Derecho Aduanero','Inglés IV']),
  ('LNI',5,ARRAY['Tratados Comerciales','Comercio Exterior de México','Negociación Internacional','Francés I']),
  ('LNI',6,ARRAY['Clasificación Arancelaria','Gestión de Exportaciones','Finanzas Corporativas','Francés II']),
  ('LNI',7,ARRAY['Plan de Negocios de Exportación','Cadenas Globales de Suministro','Mercados de Asia-Pacífico','Inversión Extranjera'])
  ) AS v(c, s, ms), unnest(ms) WITH ORDINALITY AS u(m, ord);

INSERT INTO materias (id, carrera_id, clave, nombre, semestre, creditos)
SELECT pg_temp.uid('materia-' || carrera || '-' || semestre || '-' || n), pg_temp.uid('carrera-' || carrera),
       carrera || '-' || semestre || '-' || n, nombre, semestre, CASE WHEN n <= 2 THEN 8 ELSE 6 END
  FROM plan;

-- Personal: 1 administrador y 4 docentes por carrera (n = 1..4 dentro de la carrera)
CREATE TEMP TABLE personal (email text, nombre text, rol rol_usuario, carrera text, n int);
INSERT INTO personal VALUES
  ('admin@escuela.mx',                'Jorge Ruiz Gómez',            'administrador', NULL,   NULL),
  ('maria.docente@escuela.mx',        'María López Pérez',           'docente',       'LINF', 1),
  ('hector.zenteno@escuela.mx',       'Héctor Zenteno Ruiz',         'docente',       'LINF', 2),
  ('ricardo.penagos@escuela.mx',      'Ricardo Penagos Méndez',      'docente',       'LINF', 3),
  ('oscar.figueroa@escuela.mx',       'Óscar Figueroa Liévano',      'docente',       'LINF', 4),
  ('rosa.coutino@escuela.mx',         'Rosa Elena Coutiño Ramírez',  'docente',       'LCON', 1),
  ('patricia.albores@escuela.mx',     'Patricia Albores Cruz',       'docente',       'LCON', 2),
  ('fernando.dominguez@escuela.mx',   'Fernando Domínguez Robles',   'docente',       'LCON', 3),
  ('arturo.trujillo@escuela.mx',      'Arturo Trujillo Gómez',       'docente',       'LCON', 4),
  ('adriana.grajales@escuela.mx',     'Adriana Grajales Pérez',      'docente',       'LADM', 1),
  ('gabriela.castillejos@escuela.mx', 'Gabriela Castillejos Díaz',   'docente',       'LADM', 2),
  ('laura.velazquez@escuela.mx',      'Laura Velázquez Hidalgo',     'docente',       'LADM', 3),
  ('silvia.espinosa@escuela.mx',      'Silvia Espinosa Nájera',      'docente',       'LADM', 4),
  ('carmen.nucamendi@escuela.mx',     'Carmen Nucamendi Toledo',     'docente',       'LNI',  1),
  ('marco.ozuna@escuela.mx',          'Marco Antonio Ozuna Aguilar', 'docente',       'LNI',  2),
  ('daniela.camacho@escuela.mx',      'Daniela Camacho Sántiz',      'docente',       'LNI',  3),
  ('karen.morales@escuela.mx',        'Karen Morales Girón',         'docente',       'LNI',  4);

INSERT INTO usuarios (id, escuela_id, nombre, email, password_hash, rol)
SELECT pg_temp.uid('usuario-' || email), '11111111-1111-1111-1111-111111111111', nombre, email,
       '$2b$10$ddOwY/dNyOug1IoYrSU/X.3zYT/ikh6xLdw6V0A7UTmPoU5cW.Tb6', rol  -- docente123
  FROM personal;

-- Grupos A de 1°, 3°, 5° y 7° en el periodo en curso; tutor = docente n de su carrera
INSERT INTO grupos (id, carrera_id, periodo_id, semestre, letra, tutor_id)
SELECT pg_temp.uid('grupo-' || c || '-' || s), pg_temp.uid('carrera-' || c), pg_temp.uid('periodo-2026-2'), s, 'A',
       pg_temp.uid('usuario-' || (SELECT email FROM personal p WHERE p.carrera = c AND p.n = (s + 1) / 2))
  FROM unnest(ARRAY['LCON','LADM','LINF','LNI']) AS c, unnest(ARRAY[1,3,5,7]) AS s;

-- Horario: materias 1 y 2 lunes y miércoles, 3 y 4 martes y jueves; 1° y 3° de 7 a 11, 5° y 7° de 11 a 15.
-- La materia n la imparte el docente ((n + semestre) mod 4) + 1 de la carrera.
INSERT INTO horarios (grupo_id, materia_id, docente_id, dia, hora_inicio, hora_fin)
SELECT pg_temp.uid('grupo-' || pl.carrera || '-' || pl.semestre),
       pg_temp.uid('materia-' || pl.carrera || '-' || pl.semestre || '-' || pl.n),
       pg_temp.uid('usuario-' || pe.email),
       d::dia_semana,
       make_time(CASE WHEN pl.semestre <= 3 THEN 7 ELSE 11 END + 2 * (1 - pl.n % 2), 0, 0),
       make_time(CASE WHEN pl.semestre <= 3 THEN 9 ELSE 13 END + 2 * (1 - pl.n % 2), 0, 0)
  FROM plan pl
  JOIN personal pe ON pe.carrera = pl.carrera AND pe.n = (pl.n + pl.semestre) % 4 + 1
 CROSS JOIN LATERAL unnest(CASE WHEN pl.n <= 2 THEN ARRAY['lunes','miercoles'] ELSE ARRAY['martes','jueves'] END) AS d
 WHERE pl.semestre IN (1, 3, 5, 7);

-- Alumnos: 12 por grupo; matrícula A + año de ingreso + consecutivo
CREATE TEMP TABLE nuevos AS
WITH base AS (
  SELECT c, s, i, 26 - (s - 1) / 2 AS ingreso,
         ROW_NUMBER() OVER (PARTITION BY s ORDER BY c, i) AS consecutivo
    FROM unnest(ARRAY['LCON','LADM','LINF','LNI']) AS c, unnest(ARRAY[1,3,5,7]) AS s, generate_series(1, 12) AS i
)
SELECT c AS carrera, s AS semestre,
       'A' || ingreso || lpad(consecutivo::text, 4, '0') AS matricula,
       (ARRAY['Ana','Luis','María José','Carlos','Fernanda','Diego','Valeria','José Ángel','Daniela','Jorge',
              'Andrea','Miguel','Sofía','Alejandro','Paola','Eduardo','Ximena','Ricardo','Karla','Brandon',
              'Itzel','Kevin','Montserrat','Emiliano','Guadalupe','Iván','Mariana','Ángel','Lizbeth','Óscar'])
         [1 + floor(pg_temp.azar('n' || c || s || i) * 30)::int] || ' ' ||
       (ARRAY['Gómez','Hernández','López','Pérez','Martínez','Díaz','Ruiz','Cruz','Morales','Vázquez',
              'Coutiño','Grajales','Nucamendi','Zenteno','Albores','Penagos','Castillejos','Gutiérrez','Moreno','Velasco',
              'Aguilar','Nájera','Sántiz','Gómez','Trujillo','Toledo','Camacho','Espinosa','Ozuna','Robles'])
         [1 + floor(pg_temp.azar('a' || c || s || i) * 30)::int] || ' ' ||
       (ARRAY['Pérez','Ramírez','Torres','Flores','Jiménez','Mendoza','Castillo','Reyes','Ortiz','Ramos',
              'Domínguez','Herrera','Medina','Rojas','Hidalgo','Méndez','Velázquez','Solís','Figueroa','Liévano'])
         [1 + floor(pg_temp.azar('b' || c || s || i) * 20)::int] AS nombre,
       -- "talento" del alumno: base de sus calificaciones y de su asistencia
       6.3 + 3.4 * pg_temp.azar('t' || c || s || i) AS talento
  FROM base;

INSERT INTO usuarios (id, escuela_id, nombre, email, password_hash, rol)
SELECT pg_temp.uid('usuario-' || matricula), '11111111-1111-1111-1111-111111111111', nombre,
       lower(matricula) || '@alumnos.escuela.mx',
       '$2b$10$nx3LvuV/1su02pgse3/EduG01CVgPU3XbwuPaVUIHLjs8rFkz9Q4q', 'alumno'  -- alumno123
  FROM nuevos;

INSERT INTO alumnos (id, usuario_id, matricula, carrera_id, grupo_id, semestre)
SELECT pg_temp.uid('alumno-' || matricula), pg_temp.uid('usuario-' || matricula), matricula,
       pg_temp.uid('carrera-' || carrera), pg_temp.uid('grupo-' || carrera || '-' || semestre), semestre
  FROM nuevos;

-- Kárdex: materias de semestres anteriores, cada una en el periodo en que le tocaba.
-- Periodos en orden: 1 = 2023-2 ... 7 = 2026-2; el alumno de semestre s ingresó en el periodo 8 - s.
CREATE TEMP TABLE orden_periodos AS
SELECT ROW_NUMBER() OVER (ORDER BY clave) AS k, id FROM periodos;

CREATE TEMP TABLE finales AS
SELECT pg_temp.uid('alumno-' || a.matricula) AS alumno_id,
       pg_temp.uid('materia-' || pl.carrera || '-' || pl.semestre || '-' || pl.n) AS materia_id,
       op.id AS periodo_id, a.matricula, pl.semestre, pl.n,
       greatest(5, least(10, round(a.talento + 3 * pg_temp.azar('f' || a.matricula || pl.semestre || pl.n) - 1.5))) AS cal
  FROM nuevos a
  JOIN plan pl ON pl.carrera = a.carrera AND pl.semestre < a.semestre
  JOIN orden_periodos op ON op.k = (8 - a.semestre) + (pl.semestre - 1);

INSERT INTO calificaciones_finales (alumno_id, materia_id, periodo_id, tipo, calificacion)
SELECT alumno_id, materia_id, periodo_id, 'ordinario', cal FROM finales;

-- 7 de cada 10 reprobadas se acreditan en extraordinario
INSERT INTO calificaciones_finales (alumno_id, materia_id, periodo_id, tipo, calificacion)
SELECT alumno_id, materia_id, periodo_id, 'extraordinario', 6 + floor(3 * pg_temp.azar('x' || matricula || semestre || n))
  FROM finales
 WHERE cal < 6 AND pg_temp.azar('e' || matricula || semestre || n) < 0.7;

-- Parciales 1 y 2 del periodo en curso, capturados por quien imparte la materia
INSERT INTO calificaciones (alumno_id, materia_id, periodo_id, docente_id, parcial, calificacion)
SELECT DISTINCT ON (al.id, h.materia_id, p.parcial)
       al.id, h.materia_id, pg_temp.uid('periodo-2026-2'), h.docente_id, p.parcial,
       greatest(0, least(10, round((nv.talento + 3 * pg_temp.azar('p' || nv.matricula || h.materia_id || p.parcial) - 1.6)::numeric, 1)))
  FROM nuevos nv
  JOIN alumnos al ON al.matricula = nv.matricula
  JOIN horarios h ON h.grupo_id = al.grupo_id
 CROSS JOIN (VALUES (1), (2)) AS p(parcial);

-- Asistencia de cada clase desde el inicio del periodo hasta ayer
INSERT INTO asistencias (alumno_id, materia_id, docente_id, fecha, estado)
SELECT al.id, h.materia_id, h.docente_id, f::date,
       CASE WHEN r < 0.02 + (9.7 - nv.talento) * 0.05 THEN 'falta'
            WHEN r < 0.06 + (9.7 - nv.talento) * 0.05 THEN 'retardo'
            WHEN r < 0.07 + (9.7 - nv.talento) * 0.05 THEN 'justificada'
            ELSE 'presente' END::estado_asistencia
  FROM nuevos nv
  JOIN alumnos al ON al.matricula = nv.matricula
  JOIN horarios h ON h.grupo_id = al.grupo_id
  JOIN generate_series('2026-08-10'::date, least(CURRENT_DATE - 1, '2026-12-11'::date), interval '1 day') AS f
    ON (enum_range(NULL::dia_semana))[extract(isodow FROM f)::int] = h.dia AND extract(isodow FROM f) <= 5
 CROSS JOIN LATERAL (SELECT pg_temp.azar('s' || nv.matricula || h.materia_id || f::date)) AS z(r);

-- Alertas del historial, marcadas como ya avisadas para no saturar el bot de Telegram
SELECT fn_generar_alertas();
UPDATE alertas_rezago SET enviada = TRUE, enviada_at = NOW();

COMMIT;

SELECT (SELECT COUNT(*) FROM carreras) AS carreras, (SELECT COUNT(*) FROM materias) AS materias,
       (SELECT COUNT(*) FROM usuarios WHERE rol = 'docente') AS docentes, (SELECT COUNT(*) FROM grupos) AS grupos,
       (SELECT COUNT(*) FROM alumnos) AS alumnos, (SELECT COUNT(*) FROM calificaciones_finales) AS finales,
       (SELECT COUNT(*) FROM asistencias) AS asistencias, (SELECT COUNT(*) FROM alertas_rezago) AS alertas;
