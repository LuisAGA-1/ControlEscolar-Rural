// Adaptador de salida: PostgreSQL (tablas de control_escolar).
import pg from 'pg';
import { execSync } from 'node:child_process';

function hostDeWindows() {
  // Desde WSL, el PostgreSQL de Windows está en la puerta de enlace por defecto.
  return execSync("ip route show default | awk '{print $3}'").toString().trim();
}

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

export function crearRepositorioPg(pool) {
  const filas = async (sql, params) => (await pool.query(sql, params)).rows;

  return {
    async buscarUsuarioPorEmail(email) {
      return (await filas('SELECT * FROM usuarios WHERE lower(email) = $1', [email]))[0];
    },

    async catalogoDeDocente(u) {
      // Director/admin ven toda la escuela; el docente, sus grupos (titular o por horario).
      const grupos = await filas(
        `SELECT DISTINCT g.id, g.grado, g.letra, g.ciclo
           FROM grupos g LEFT JOIN horarios h ON h.grupo_id = g.id
          WHERE g.escuela_id = $1 AND ($2 <> 'docente' OR g.docente_id = $3 OR h.docente_id = $3)
          ORDER BY g.grado, g.letra`,
        [u.escuela_id, u.rol, u.id]
      );
      const ids = grupos.map((g) => g.id);
      const [alumnos, materias, horarios] = await Promise.all([
        filas(`SELECT id, grupo_id, nombre, curp FROM alumnos WHERE activo AND grupo_id = ANY($1) ORDER BY nombre`, [ids]),
        filas(`SELECT id, nombre FROM materias WHERE escuela_id = $1 ORDER BY nombre`, [u.escuela_id]),
        filas(
          `SELECT h.id, h.grupo_id, h.dia, to_char(h.hora_inicio,'HH24:MI') AS hora_inicio,
                  to_char(h.hora_fin,'HH24:MI') AS hora_fin, m.nombre AS materia, us.nombre AS docente
             FROM horarios h JOIN materias m ON m.id = h.materia_id JOIN usuarios us ON us.id = h.docente_id
            WHERE h.grupo_id = ANY($1) ORDER BY h.dia, h.hora_inicio`,
          [ids]
        ),
      ]);
      return { grupos, alumnos, materias, horarios };
    },

    async guardarRegistros(usuarioId, { asistencias, calificaciones }) {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        for (const a of asistencias) {
          await c.query(
            `INSERT INTO asistencias (alumno_id, docente_id, fecha, estado, observacion)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (alumno_id, fecha) DO UPDATE
               SET estado = EXCLUDED.estado, observacion = EXCLUDED.observacion, docente_id = EXCLUDED.docente_id`,
            [a.alumno_id, usuarioId, a.fecha, a.estado, a.observacion]
          );
        }
        for (const k of calificaciones) {
          await c.query(
            `INSERT INTO calificaciones (alumno_id, materia_id, docente_id, parcial, calificacion)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (alumno_id, materia_id, parcial) DO UPDATE
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

    async generarAlertas() {
      return (await filas('SELECT fn_generar_alertas() AS n'))[0].n;
    },

    // A quién avisar: al director de la escuela y al docente titular del grupo.
    alertasPendientes: () =>
      filas(
        `SELECT r.id, r.nivel, r.detalle, al.nombre AS alumno, g.grado || '°' || g.letra AS grupo, u.telegram_chat_id AS chat_id
           FROM alertas_rezago r
           JOIN alumnos al ON al.id = r.alumno_id
           JOIN grupos g ON g.id = al.grupo_id
           JOIN usuarios u ON u.escuela_id = g.escuela_id AND (u.rol = 'director' OR u.id = g.docente_id)
          WHERE NOT r.enviada AND u.telegram_chat_id IS NOT NULL`
      ),

    marcarAlertaEnviada: (id) =>
      pool.query('UPDATE alertas_rezago SET enviada = TRUE, enviada_at = NOW() WHERE id = $1', [id]),

    alertasDeDocente: (u) =>
      filas(
        `SELECT r.id, r.tipo, r.nivel, r.detalle, r.enviada, r.atendida, r.created_at,
                al.nombre AS alumno, g.grado || '°' || g.letra AS grupo
           FROM alertas_rezago r
           JOIN alumnos al ON al.id = r.alumno_id
           JOIN grupos g ON g.id = al.grupo_id
          WHERE g.escuela_id = $1 AND NOT r.atendida
            AND ($2 <> 'docente' OR g.docente_id = $3
                 OR EXISTS (SELECT 1 FROM horarios h WHERE h.grupo_id = g.id AND h.docente_id = $3))
          ORDER BY r.created_at DESC`,
        [u.escuela_id, u.rol, u.id]
      ),
  };
}
