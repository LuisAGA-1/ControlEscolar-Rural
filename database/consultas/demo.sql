-- =====================================================================
--  consultas/demo.sql · Consultas de demostración sobre la base del SIAE
--  Solo lectura (SELECT): se pueden correr las veces que sea, no cambian nada.
--  Va en una subcarpeta a propósito: lo que está suelto en database/ se ejecuta al crear la BD.
--
--  En la instancia BD de AWS (carpeta aws/bd del repo):
--    cd ~/ControlEscolar-Rural/aws/bd
--    sudo docker compose exec -T db psql -U postgres -d control_escolar < ../../database/consultas/demo.sql
--  Una por una, en modo interactivo:
--    sudo docker compose exec db psql -U postgres -d control_escolar
--    (dentro de psql: \x auto para tablas anchas, \q para salir)
--  En la máquina local (compose de la raíz):
--    docker compose exec -T db psql -U postgres -d control_escolar < database/consultas/demo.sql
-- =====================================================================
\pset footer on

-- ---------------------------------------------------------------------
-- 1) Panorama general: cuántos registros hay en cada tabla
-- ---------------------------------------------------------------------
\echo '1) Resumen de la base'
SELECT 'carreras' AS tabla, COUNT(*) AS registros FROM carreras
UNION ALL SELECT 'materias',               COUNT(*) FROM materias
UNION ALL SELECT 'grupos',                 COUNT(*) FROM grupos
UNION ALL SELECT 'docentes',               COUNT(*) FROM usuarios WHERE rol = 'docente'
UNION ALL SELECT 'alumnos',                COUNT(*) FROM alumnos
UNION ALL SELECT 'horarios (sesiones)',    COUNT(*) FROM horarios
UNION ALL SELECT 'asistencias',            COUNT(*) FROM asistencias
UNION ALL SELECT 'calificaciones parciales', COUNT(*) FROM calificaciones
UNION ALL SELECT 'calificaciones finales', COUNT(*) FROM calificaciones_finales
UNION ALL SELECT 'alertas de rezago',      COUNT(*) FROM alertas_rezago
UNION ALL SELECT 'constancias emitidas',   COUNT(*) FROM constancias;

-- ---------------------------------------------------------------------
-- 2) Matrícula por carrera y semestre (JOIN + GROUP BY + FILTER)
-- ---------------------------------------------------------------------
\echo '2) Alumnos por carrera y semestre'
SELECT c.clave, c.nombre AS carrera,
       COUNT(*) FILTER (WHERE a.semestre = 1) AS "1°",
       COUNT(*) FILTER (WHERE a.semestre = 3) AS "3°",
       COUNT(*) FILTER (WHERE a.semestre = 5) AS "5°",
       COUNT(*) FILTER (WHERE a.semestre = 7) AS "7°",
       COUNT(*) AS total
  FROM alumnos a
  JOIN carreras c ON c.id = a.carrera_id
 GROUP BY c.clave, c.nombre
 ORDER BY c.clave;

-- ---------------------------------------------------------------------
-- 3) Promedio de parciales del periodo en curso por carrera
-- ---------------------------------------------------------------------
\echo '3) Promedio del periodo activo por carrera'
SELECT c.nombre AS carrera, p.clave AS periodo,
       ROUND(AVG(k.calificacion), 2) AS promedio,
       MIN(k.calificacion) AS minima, MAX(k.calificacion) AS maxima,
       ROUND(100.0 * COUNT(*) FILTER (WHERE k.calificacion < 6) / COUNT(*), 1) AS "% reprobados"
  FROM calificaciones k
  JOIN periodos p ON p.id = k.periodo_id AND p.activo
  JOIN alumnos  a ON a.id = k.alumno_id
  JOIN carreras c ON c.id = a.carrera_id
 GROUP BY c.nombre, p.clave
 ORDER BY promedio DESC;

-- ---------------------------------------------------------------------
-- 4) Grupos con su tutor, número de alumnos y promedio (LEFT JOIN + subconsulta)
-- ---------------------------------------------------------------------
\echo '4) Grupos del periodo activo'
SELECT c.clave || '-' || g.semestre || g.letra AS grupo,
       COALESCE(t.nombre, '(sin tutor)') AS tutor,
       COUNT(a.id) AS alumnos,
       ROUND(AVG(v.promedio), 2) AS promedio_grupo
  FROM grupos g
  JOIN carreras c ON c.id = g.carrera_id
  JOIN periodos p ON p.id = g.periodo_id AND p.activo
  LEFT JOIN usuarios t ON t.id = g.tutor_id
  LEFT JOIN alumnos  a ON a.grupo_id = g.id
  LEFT JOIN v_promedios v ON v.alumno_id = a.id
 GROUP BY c.clave, g.semestre, g.letra, t.nombre
 ORDER BY c.clave, g.semestre;

-- ---------------------------------------------------------------------
-- 5) Cuadro de honor: los 3 mejores promedios de kárdex por carrera (RANK sobre ventana)
-- ---------------------------------------------------------------------
\echo '5) Mejores 3 alumnos por carrera (promedio de kárdex)'
WITH promedios AS (
    SELECT a.matricula, u.nombre, c.clave AS carrera, a.semestre,
           ROUND(AVG(k.calificacion), 2) AS promedio,
           RANK() OVER (PARTITION BY c.clave ORDER BY AVG(k.calificacion) DESC) AS lugar
      FROM v_kardex k
      JOIN alumnos  a ON a.id = k.alumno_id
      JOIN usuarios u ON u.id = a.usuario_id
      JOIN carreras c ON c.id = a.carrera_id
     GROUP BY a.matricula, u.nombre, c.clave, a.semestre
)
SELECT carrera, lugar, matricula, nombre, semestre, promedio
  FROM promedios
 WHERE lugar <= 3
 ORDER BY carrera, lugar;

-- ---------------------------------------------------------------------
-- 6) Kárdex de un alumno con créditos acumulados (vista + SUM acumulado)
--    Cambia la matrícula para ver a otro alumno.
-- ---------------------------------------------------------------------
\echo '6) Kárdex del alumno A230001'
SELECT k.periodo, k.semestre, k.clave, k.materia, k.tipo, k.calificacion,
       CASE WHEN k.aprobada THEN 'Aprobada' ELSE 'Reprobada' END AS estatus,
       SUM(k.creditos) FILTER (WHERE k.aprobada)
           OVER (ORDER BY k.semestre, k.clave) AS creditos_acumulados
  FROM v_kardex k
  JOIN alumnos a ON a.id = k.alumno_id
 WHERE a.matricula = 'A230001'
 ORDER BY k.semestre, k.clave;

-- ---------------------------------------------------------------------
-- 7) Alumnos en riesgo: promedio bajo o muchas faltas en el periodo (CTE + criterios combinados)
-- ---------------------------------------------------------------------
\echo '7) Alumnos en riesgo académico (periodo activo)'
WITH faltas AS (
    SELECT s.alumno_id,
           ROUND(100.0 * COUNT(*) FILTER (WHERE s.estado = 'falta') / COUNT(*), 1) AS pct_faltas
      FROM asistencias s
      JOIN periodos p ON p.activo AND s.fecha BETWEEN p.inicio AND p.fin
     GROUP BY s.alumno_id
)
SELECT a.matricula, u.nombre, c.clave || '-' || a.semestre AS carrera_sem,
       v.promedio, f.pct_faltas AS "% faltas",
       CASE WHEN v.promedio < 6 AND f.pct_faltas > 15 THEN 'Promedio y faltas'
            WHEN v.promedio < 6 THEN 'Promedio reprobatorio'
            ELSE 'Inasistencia alta' END AS motivo
  FROM alumnos a
  JOIN usuarios u ON u.id = a.usuario_id
  JOIN carreras c ON c.id = a.carrera_id
  LEFT JOIN v_promedios v ON v.alumno_id = a.id
  LEFT JOIN faltas      f ON f.alumno_id = a.id
 WHERE v.promedio < 6 OR f.pct_faltas > 15
 ORDER BY v.promedio NULLS LAST, f.pct_faltas DESC;

-- ---------------------------------------------------------------------
-- 8) Materias más difíciles: índice de reprobación histórico (HAVING)
-- ---------------------------------------------------------------------
\echo '8) Top 10 materias con más reprobación en ordinario'
SELECT c.clave AS carrera, m.semestre, m.nombre AS materia,
       COUNT(*) AS evaluados,
       COUNT(*) FILTER (WHERE f.calificacion < 6) AS reprobados,
       ROUND(100.0 * COUNT(*) FILTER (WHERE f.calificacion < 6) / COUNT(*), 1) AS "% reprobación",
       ROUND(AVG(f.calificacion), 2) AS promedio
  FROM calificaciones_finales f
  JOIN materias m ON m.id = f.materia_id
  JOIN carreras c ON c.id = m.carrera_id
 WHERE f.tipo = 'ordinario'
 GROUP BY c.clave, m.semestre, m.nombre
HAVING COUNT(*) >= 10
 ORDER BY "% reprobación" DESC, promedio
 LIMIT 10;

-- ---------------------------------------------------------------------
-- 9) Alumnos que presentaron extraordinario y cómo les fue (self-join de finales)
-- ---------------------------------------------------------------------
\echo '9) Extraordinarios: calificación ordinaria vs extraordinaria'
SELECT a.matricula, u.nombre, m.nombre AS materia, p.clave AS periodo,
       o.calificacion AS ordinario, e.calificacion AS extraordinario,
       CASE WHEN e.calificacion >= 6 THEN 'Regularizado' ELSE 'Sigue reprobada' END AS resultado
  FROM calificaciones_finales e
  JOIN calificaciones_finales o ON o.alumno_id = e.alumno_id AND o.materia_id = e.materia_id
                               AND o.periodo_id = e.periodo_id AND o.tipo = 'ordinario'
  JOIN alumnos  a ON a.id = e.alumno_id
  JOIN usuarios u ON u.id = a.usuario_id
  JOIN materias m ON m.id = e.materia_id
  JOIN periodos p ON p.id = e.periodo_id
 WHERE e.tipo = 'extraordinario'
 ORDER BY p.clave, a.matricula;

-- ---------------------------------------------------------------------
-- 10) Horario semanal de una docente (orden por enum de días)
-- ---------------------------------------------------------------------
\echo '10) Horario de maria.docente@escuela.mx'
SELECT h.dia, to_char(h.hora_inicio, 'HH24:MI') || '-' || to_char(h.hora_fin, 'HH24:MI') AS hora,
       m.nombre AS materia, c.clave || '-' || g.semestre || g.letra AS grupo
  FROM horarios h
  JOIN usuarios d ON d.id = h.docente_id
  JOIN materias m ON m.id = h.materia_id
  JOIN grupos   g ON g.id = h.grupo_id
  JOIN carreras c ON c.id = g.carrera_id
 WHERE d.email = 'maria.docente@escuela.mx'
 ORDER BY h.dia, h.hora_inicio;

-- ---------------------------------------------------------------------
-- 11) Carga docente: horas a la semana, materias y grupos (aritmética de TIME)
-- ---------------------------------------------------------------------
\echo '11) Carga horaria por docente'
SELECT d.nombre AS docente,
       COUNT(DISTINCT h.materia_id) AS materias,
       COUNT(DISTINCT h.grupo_id)   AS grupos,
       ROUND(SUM(EXTRACT(EPOCH FROM h.hora_fin - h.hora_inicio)) / 3600, 1) AS horas_semana
  FROM usuarios d
  JOIN horarios h ON h.docente_id = d.id
 WHERE d.rol = 'docente'
 GROUP BY d.nombre
 ORDER BY horas_semana DESC;

-- ---------------------------------------------------------------------
-- 12) Asistencia por mes del periodo (date_trunc + porcentajes)
-- ---------------------------------------------------------------------
\echo '12) Asistencia mensual del periodo activo'
SELECT to_char(date_trunc('month', s.fecha), 'YYYY-MM') AS mes,
       COUNT(*) AS registros,
       ROUND(100.0 * COUNT(*) FILTER (WHERE s.estado = 'presente')    / COUNT(*), 1) AS "% presente",
       ROUND(100.0 * COUNT(*) FILTER (WHERE s.estado = 'retardo')     / COUNT(*), 1) AS "% retardo",
       ROUND(100.0 * COUNT(*) FILTER (WHERE s.estado = 'falta')       / COUNT(*), 1) AS "% falta",
       ROUND(100.0 * COUNT(*) FILTER (WHERE s.estado = 'justificada') / COUNT(*), 1) AS "% justificada"
  FROM asistencias s
  JOIN periodos p ON p.activo AND s.fecha BETWEEN p.inicio AND p.fin
 GROUP BY 1
 ORDER BY 1;

-- ---------------------------------------------------------------------
-- 13) Alertas de rezago pendientes, con grupo y tutor a quien avisar
-- ---------------------------------------------------------------------
\echo '13) Alertas sin atender'
SELECT r.nivel, r.tipo, a.matricula, u.nombre AS alumno, r.detalle,
       c.clave || '-' || g.semestre || g.letra AS grupo, t.nombre AS tutor,
       CASE WHEN r.enviada THEN 'Sí' ELSE 'No' END AS enviada_telegram,
       to_char(r.created_at, 'YYYY-MM-DD') AS fecha
  FROM alertas_rezago r
  JOIN alumnos  a ON a.id = r.alumno_id
  JOIN usuarios u ON u.id = a.usuario_id
  LEFT JOIN grupos   g ON g.id = a.grupo_id
  LEFT JOIN carreras c ON c.id = g.carrera_id
  LEFT JOIN usuarios t ON t.id = g.tutor_id
 WHERE NOT r.atendida
 ORDER BY r.nivel DESC, r.created_at DESC;

-- ---------------------------------------------------------------------
-- 14) Adeudos: alumnos con materias reprobadas que aún no regularizan (STRING_AGG)
-- ---------------------------------------------------------------------
\echo '14) Alumnos con materias reprobadas pendientes'
SELECT a.matricula, u.nombre, c.clave || '-' || a.semestre AS carrera_sem,
       COUNT(*) AS adeudos,
       STRING_AGG(k.materia || ' (' || k.calificacion || ')', ', ' ORDER BY k.semestre) AS materias
  FROM v_kardex k
  JOIN alumnos  a ON a.id = k.alumno_id
  JOIN usuarios u ON u.id = a.usuario_id
  JOIN carreras c ON c.id = a.carrera_id
 WHERE NOT k.aprobada
 GROUP BY a.matricula, u.nombre, c.clave, a.semestre
 ORDER BY adeudos DESC, a.matricula;

-- ---------------------------------------------------------------------
-- 15) Usuarios vinculados al bot de Telegram por rol
-- ---------------------------------------------------------------------
\echo '15) Vinculación con Telegram por rol'
SELECT rol, COUNT(*) AS usuarios,
       COUNT(telegram_chat_id) AS con_telegram,
       ROUND(100.0 * COUNT(telegram_chat_id) / COUNT(*), 1) AS "% vinculados"
  FROM usuarios
 GROUP BY rol
 ORDER BY rol;
