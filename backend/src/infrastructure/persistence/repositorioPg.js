// Adaptador de salida: PostgreSQL (tablas de control_escolar). Implementa el puerto Repositorio.
import pg from 'pg';
import { execSync } from 'node:child_process';

function hostDeWindows() {
  // Desde WSL, el PostgreSQL de Windows está en la puerta de enlace por defecto.
  return execSync("ip route show default | awk '{print $3}'").toString().trim();
}

// Las columnas DATE llegan como texto 'AAAA-MM-DD' y no como Date a medianoche local (evita días corridos).
pg.types.setTypeParser(1082, (v) => v);

export function crearPool(env = process.env) {
  const host = env.DB_HOST === 'windows' ? hostDeWindows() : env.DB_HOST || 'localhost';
  return new pg.Pool({
    host,
    port: Number(env.DB_PORT || 5432),
    database: env.DB_NAME || 'control_escolar',
    user: env.DB_USER || 'postgres',
    password: env.DB_PASSWORD,
    ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined, // RDS
  });
}

// Grupos del periodo en curso que ve cada rol: administrador todos, docente donde imparte, alumno el suyo.
const GRUPOS_VISIBLES = `
  SELECT g.id FROM grupos g JOIN periodos p ON p.id = g.periodo_id AND p.activo
   WHERE $1 = 'administrador'
      OR ($1 = 'docente' AND EXISTS (SELECT 1 FROM horarios h WHERE h.grupo_id = g.id AND h.docente_id = $2))
      OR ($1 = 'alumno' AND g.id = (SELECT grupo_id FROM alumnos WHERE id = $3))`;

const NOMBRE_GRUPO = `g.semestre || '°' || g.letra || ' ' || c.clave`;

/** @returns {import('../../application/puertos.js').Repositorio} */
export function crearRepositorioPg(pool) {
  const filas = async (sql, params) => (await pool.query(sql, params)).rows;

  return {
    async buscarUsuario({ email, matricula, chatId }) {
      return (
        await filas(
          `SELECT u.*, a.id AS alumno_id, a.matricula
             FROM usuarios u LEFT JOIN alumnos a ON a.usuario_id = u.id
            WHERE ($1::text IS NOT NULL AND lower(u.email) = $1) OR ($2::text IS NOT NULL AND a.matricula = $2)
               OR ($3::text IS NOT NULL AND u.telegram_chat_id = $3)`,
          [email ?? null, matricula ?? null, chatId ?? null]
        )
      )[0];
    },

    async catalogo(u) {
      const visibles = [u.rol, u.id, u.alumno_id ?? null];
      // El docente solo ve sus propias clases; administrador y alumno, todas las del grupo.
      const soloSuyas = `($1 <> 'docente' OR h.docente_id = $2)`;
      const [grupos, alumnos, horarios] = await Promise.all([
        filas(
          `SELECT g.id, g.semestre, g.letra, c.clave AS carrera, c.nombre AS carrera_nombre, p.clave AS periodo
             FROM grupos g JOIN carreras c ON c.id = g.carrera_id JOIN periodos p ON p.id = g.periodo_id
            WHERE g.id IN (${GRUPOS_VISIBLES}) ORDER BY c.clave, g.semestre, g.letra`,
          visibles
        ),
        // El alumno no recibe la lista de sus compañeros.
        filas(
          `SELECT a.id, a.grupo_id, a.matricula, us.nombre
             FROM alumnos a JOIN usuarios us ON us.id = a.usuario_id
            WHERE us.activo AND a.grupo_id IN (${GRUPOS_VISIBLES}) AND ($1 <> 'alumno' OR a.id = $3)
            ORDER BY us.nombre`,
          visibles
        ),
        filas(
          `SELECT h.id, h.grupo_id, h.materia_id, h.dia, to_char(h.hora_inicio,'HH24:MI') AS hora_inicio,
                  to_char(h.hora_fin,'HH24:MI') AS hora_fin, m.nombre AS materia, us.nombre AS docente
             FROM horarios h JOIN materias m ON m.id = h.materia_id JOIN usuarios us ON us.id = h.docente_id
            WHERE h.grupo_id IN (${GRUPOS_VISIBLES}) AND ${soloSuyas}
            ORDER BY h.dia, h.hora_inicio`,
          visibles
        ),
      ]);
      const materias = [...new Map(horarios.map((h) => [h.materia_id, { id: h.materia_id, nombre: h.materia, grupo_id: h.grupo_id }])).values()];
      return { grupos, alumnos, materias, horarios };
    },

    async paresQueImparte(docenteId, pares) {
      const rows = await filas(
        `SELECT DISTINCT a.id || '|' || h.materia_id AS clave
           FROM unnest($2::uuid[], $3::uuid[]) AS par(alumno_id, materia_id)
           JOIN alumnos a ON a.id = par.alumno_id
           JOIN horarios h ON h.grupo_id = a.grupo_id AND h.materia_id = par.materia_id AND h.docente_id = $1
           JOIN grupos g ON g.id = h.grupo_id JOIN periodos p ON p.id = g.periodo_id AND p.activo`,
        [docenteId, pares.map((p) => p.alumno_id), pares.map((p) => p.materia_id)]
      );
      return rows.map((r) => r.clave);
    },

    async guardarRegistros(usuarioId, { asistencias, calificaciones }) {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        for (const a of asistencias) {
          await c.query(
            `INSERT INTO asistencias (alumno_id, materia_id, docente_id, fecha, estado, observacion)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (alumno_id, materia_id, fecha) DO UPDATE
               SET estado = EXCLUDED.estado, observacion = EXCLUDED.observacion, docente_id = EXCLUDED.docente_id`,
            [a.alumno_id, a.materia_id, usuarioId, a.fecha, a.estado, a.observacion]
          );
        }
        for (const k of calificaciones) {
          await c.query(
            `INSERT INTO calificaciones (alumno_id, materia_id, periodo_id, docente_id, parcial, calificacion)
             VALUES ($1, $2, (SELECT id FROM periodos WHERE activo), $3, $4, $5)
             ON CONFLICT (alumno_id, materia_id, periodo_id, parcial) DO UPDATE
               SET calificacion = EXCLUDED.calificacion, docente_id = EXCLUDED.docente_id`,
            [k.alumno_id, k.materia_id, usuarioId, k.parcial, k.calificacion]
          );
        }
        await c.query('COMMIT');
        return { asistencias: asistencias.length, calificaciones: calificaciones.length };
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      } finally {
        c.release();
      }
    },

    async imparte(docenteId, grupoId, materiaId) {
      const rows = await filas(
        `SELECT 1 FROM horarios h JOIN grupos g ON g.id = h.grupo_id JOIN periodos p ON p.id = g.periodo_id AND p.activo
          WHERE h.docente_id = $1 AND h.grupo_id = $2 AND ($3::uuid IS NULL OR h.materia_id = $3) LIMIT 1`,
        [docenteId, grupoId, materiaId ?? null]
      );
      return rows.length > 0;
    },

    async registrosDeClase({ grupoId, materiaId, fecha, parcial }) {
      const [asistencias, calificaciones] = await Promise.all([
        filas(
          `SELECT s.alumno_id, s.estado FROM asistencias s JOIN alumnos a ON a.id = s.alumno_id
            WHERE a.grupo_id = $1 AND s.materia_id = $2 AND s.fecha = $3`,
          [grupoId, materiaId, fecha]
        ),
        filas(
          `SELECT k.alumno_id, k.calificacion FROM calificaciones k
             JOIN alumnos a ON a.id = k.alumno_id JOIN periodos p ON p.id = k.periodo_id AND p.activo
            WHERE a.grupo_id = $1 AND k.materia_id = $2 AND k.parcial = $3`,
          [grupoId, materiaId, parcial]
        ),
      ]);
      return { asistencias, calificaciones };
    },

    calificacionesDelPeriodo: (alumnoId, { docenteId }) =>
      filas(
        `SELECT m.id AS materia_id, m.clave, m.nombre AS materia, k.parcial, k.calificacion
           FROM calificaciones k
           JOIN materias m ON m.id = k.materia_id
           JOIN periodos p ON p.id = k.periodo_id AND p.activo
          WHERE k.alumno_id = $1
            AND ($2::uuid IS NULL OR EXISTS (
                  SELECT 1 FROM horarios h JOIN alumnos a ON a.grupo_id = h.grupo_id
                   WHERE a.id = k.alumno_id AND h.materia_id = k.materia_id AND h.docente_id = $2))
          ORDER BY m.clave, k.parcial`,
        [alumnoId, docenteId ?? null]
      ),

    kardex: (alumnoId) =>
      filas(
        `SELECT clave, materia, semestre, creditos, periodo, tipo, calificacion, aprobada
           FROM v_kardex WHERE alumno_id = $1 ORDER BY semestre, clave`,
        [alumnoId]
      ),

    async datosAlumno(alumnoId) {
      return (
        await filas(
          `SELECT u.nombre, a.matricula, a.semestre, a.curp, c.nombre AS carrera, g.letra AS grupo,
                  p.clave AS periodo, p.inicio, p.fin, e.nombre AS escuela, e.municipio
             FROM alumnos a
             JOIN usuarios u ON u.id = a.usuario_id
             JOIN carreras c ON c.id = a.carrera_id
             JOIN escuelas e ON e.id = c.escuela_id
             LEFT JOIN grupos g ON g.id = a.grupo_id
             LEFT JOIN periodos p ON p.activo
            WHERE a.id = $1`,
          [alumnoId]
        )
      )[0];
    },

    async guardarConstancia({ folio, codigo, alumno_id, tipo, emitida_por }) {
      await pool.query(
        `INSERT INTO constancias (folio, codigo_verificacion, alumno_id, tipo, emitida_por) VALUES ($1, $2, $3, $4, $5)`,
        [folio, codigo, alumno_id, tipo, emitida_por]
      );
    },

    async buscarConstancia(folio, codigo) {
      return (
        await filas(
          `SELECT k.folio, k.tipo, k.created_at, u.nombre AS alumno, a.matricula, c.nombre AS carrera
             FROM constancias k
             JOIN alumnos a ON a.id = k.alumno_id
             JOIN usuarios u ON u.id = a.usuario_id
             JOIN carreras c ON c.id = a.carrera_id
            WHERE k.folio = $1 AND k.codigo_verificacion = $2`,
          [folio, codigo]
        )
      )[0];
    },

    // Asistencia = presentes y retardos entre todas las clases registradas.
    reporteGrupo: (grupoId) =>
      filas(
        `WITH materias_grupo AS (
           SELECT DISTINCT h.materia_id, h.docente_id FROM horarios h WHERE h.grupo_id = $1
         ), por_alumno AS (
           SELECT k.materia_id, k.alumno_id, AVG(k.calificacion) AS prom
             FROM calificaciones k JOIN alumnos a ON a.id = k.alumno_id AND a.grupo_id = $1
             JOIN periodos p ON p.id = k.periodo_id AND p.activo
            GROUP BY k.materia_id, k.alumno_id
         )
         SELECT m.id AS materia_id, m.nombre AS materia, u.nombre AS docente,
                (SELECT ROUND(AVG(prom), 2) FROM por_alumno pa WHERE pa.materia_id = m.id) AS promedio,
                (SELECT COUNT(*) FROM por_alumno pa WHERE pa.materia_id = m.id AND pa.prom < 6)::int AS reprobados,
                (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE s.estado IN ('presente', 'retardo')) / NULLIF(COUNT(*), 0), 1)
                   FROM asistencias s JOIN alumnos a ON a.id = s.alumno_id AND a.grupo_id = $1
                  WHERE s.materia_id = m.id) AS asistencia
           FROM materias_grupo mg JOIN materias m ON m.id = mg.materia_id JOIN usuarios u ON u.id = mg.docente_id
          ORDER BY m.clave`,
        [grupoId]
      ),

    reporteEscuela: () =>
      filas(
        `SELECT g.id AS grupo_id, ${NOMBRE_GRUPO} AS grupo, c.nombre AS carrera,
                (SELECT COUNT(*) FROM alumnos a WHERE a.grupo_id = g.id)::int AS alumnos,
                (SELECT ROUND(AVG(k.calificacion), 2) FROM calificaciones k JOIN alumnos a ON a.id = k.alumno_id
                  WHERE a.grupo_id = g.id AND k.periodo_id = g.periodo_id) AS promedio,
                (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE s.estado IN ('presente', 'retardo')) / NULLIF(COUNT(*), 0), 1)
                   FROM asistencias s JOIN alumnos a ON a.id = s.alumno_id WHERE a.grupo_id = g.id) AS asistencia,
                (SELECT COUNT(*) FROM alertas_rezago r JOIN alumnos a ON a.id = r.alumno_id
                  WHERE a.grupo_id = g.id AND NOT r.atendida)::int AS alertas
           FROM grupos g JOIN carreras c ON c.id = g.carrera_id JOIN periodos p ON p.id = g.periodo_id AND p.activo
          ORDER BY c.clave, g.semestre, g.letra`
      ),

    async generarAlertas() {
      return (await filas('SELECT fn_generar_alertas() AS n'))[0].n;
    },

    // A quién avisar: a los administradores y al tutor del grupo.
    alertasPendientes: () =>
      filas(
        `SELECT r.id, r.nivel, r.detalle, ua.nombre AS alumno, ${NOMBRE_GRUPO} AS grupo, u.telegram_chat_id AS chat_id
           FROM alertas_rezago r
           JOIN alumnos al ON al.id = r.alumno_id
           JOIN usuarios ua ON ua.id = al.usuario_id
           JOIN grupos g ON g.id = al.grupo_id
           JOIN carreras c ON c.id = g.carrera_id
           JOIN usuarios u ON u.rol = 'administrador' OR u.id = g.tutor_id
          WHERE NOT r.enviada AND u.telegram_chat_id IS NOT NULL`
      ),

    marcarAlertaEnviada: (id) =>
      pool.query('UPDATE alertas_rezago SET enviada = TRUE, enviada_at = NOW() WHERE id = $1', [id]),

    async guardarVinculacion(usuarioId, codigo, expira) {
      await pool.query(
        `INSERT INTO vinculaciones_telegram (usuario_id, codigo, expira_at) VALUES ($1, $2, $3)
         ON CONFLICT (usuario_id) DO UPDATE SET codigo = EXCLUDED.codigo, expira_at = EXCLUDED.expira_at`,
        [usuarioId, codigo, expira]
      );
    },

    async consumirVinculacion(codigo, ahora) {
      const r = await filas(
        'DELETE FROM vinculaciones_telegram WHERE codigo = $1 AND expira_at > $2 RETURNING usuario_id',
        [codigo, ahora]
      );
      return r.length === 1 ? r[0].usuario_id : undefined; // dos códigos iguales vigentes: que pidan otro
    },

    async asignarChat(usuarioId, chatId) {
      await pool.query('UPDATE usuarios SET telegram_chat_id = NULL WHERE telegram_chat_id = $2 AND id <> $1', [usuarioId, chatId]);
      await pool.query('UPDATE usuarios SET telegram_chat_id = $2 WHERE id = $1', [usuarioId, chatId]);
    },

    alertasDe: (u) =>
      filas(
        `SELECT r.id, r.tipo, r.nivel, r.detalle, r.enviada, r.atendida, r.created_at,
                ua.nombre AS alumno, al.matricula, ${NOMBRE_GRUPO} AS grupo
           FROM alertas_rezago r
           JOIN alumnos al ON al.id = r.alumno_id
           JOIN usuarios ua ON ua.id = al.usuario_id
           JOIN grupos g ON g.id = al.grupo_id
           JOIN carreras c ON c.id = g.carrera_id
          WHERE NOT r.atendida AND g.id IN (${GRUPOS_VISIBLES})
          ORDER BY r.created_at DESC`,
        [u.rol, u.id, null]
      ),
  };
}
