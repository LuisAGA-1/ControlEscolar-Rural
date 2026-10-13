using ControlEscolar.Data;
using ControlEscolar.Models;
using Npgsql;

namespace ControlEscolar.Repostories;

// Todas las consultas pasan por FILTRO: el docente solo ve sus grupos (titular o por horario);
// director y admin ven toda su escuela.
public class EscolarRepository
{
    const string FILTRO = """
        g.escuela_id = @esc AND (@rol <> 'docente' OR g.docente_id = @uid
            OR EXISTS (SELECT 1 FROM horarios hx WHERE hx.grupo_id = g.id AND hx.docente_id = @uid))
        """;
    const string PRESENTE = "s.estado IN ('presente', 'retardo')";

    static async Task<List<T>> Lista<T>(UsuarioActual? u, string sql, Func<NpgsqlDataReader, T> map, params (string, object?)[] ps)
    {
        await using var c = DatabaseConnection.CreateConnection();
        await c.OpenAsync();
        await using var cmd = new NpgsqlCommand(sql, c);
        if (u is not null)
        {
            cmd.Parameters.AddWithValue("esc", u.EscuelaId);
            cmd.Parameters.AddWithValue("rol", u.Rol);
            cmd.Parameters.AddWithValue("uid", u.Id);
        }
        foreach (var (n, v) in ps) cmd.Parameters.AddWithValue(n, v ?? DBNull.Value);
        await using var r = await cmd.ExecuteReaderAsync();
        var res = new List<T>();
        while (await r.ReadAsync()) res.Add(map(r));
        return res;
    }

    static T? Nulo<T>(NpgsqlDataReader r, int i) => r.IsDBNull(i) ? default : r.GetFieldValue<T>(i);

    public async Task<(UsuarioActual Usuario, string Hash, bool Activo)?> BuscarUsuarioAsync(string email)
    {
        var l = await Lista(null,
            "SELECT id, nombre, email, rol::text, escuela_id, password_hash, activo FROM usuarios WHERE lower(email) = lower(@email)",
            r => (new UsuarioActual(r.GetGuid(0), r.GetString(1), r.GetString(2), r.GetString(3), r.GetGuid(4)), r.GetString(5), r.GetBoolean(6)),
            ("email", email));
        return l.Count == 0 ? null : l[0];
    }

    public Task<List<Grupo>> GruposAsync(UsuarioActual u) => Lista(u, $"""
        SELECT g.id, g.grado, g.letra, g.ciclo, (SELECT count(*) FROM alumnos a WHERE a.grupo_id = g.id AND a.activo),
               (SELECT count(*) FROM asistencias s JOIN alumnos a ON a.id = s.alumno_id
                 WHERE a.grupo_id = g.id AND a.activo AND s.fecha = CURRENT_DATE)
          FROM grupos g WHERE {FILTRO} ORDER BY g.grado, g.letra
        """, r => new Grupo(r.GetGuid(0), r.GetInt16(1), r.GetString(2), r.GetString(3), r.GetInt64(4), r.GetInt64(5)));

    public async Task<Resumen> ResumenAsync(UsuarioActual u)
    {
        var conteos = (await Lista(u, $"""
            SELECT (SELECT count(*) FROM alumnos a JOIN grupos g ON g.id = a.grupo_id WHERE a.activo AND {FILTRO}),
                   (SELECT count(*) FROM grupos g WHERE {FILTRO}),
                   (SELECT round(100.0 * count(*) FILTER (WHERE {PRESENTE}) / NULLIF(count(*), 0))::int
                      FROM asistencias s JOIN alumnos a ON a.id = s.alumno_id JOIN grupos g ON g.id = a.grupo_id
                     WHERE s.fecha = CURRENT_DATE AND {FILTRO}),
                   (SELECT count(*) FROM alertas_rezago r JOIN alumnos a ON a.id = r.alumno_id JOIN grupos g ON g.id = a.grupo_id
                     WHERE NOT r.atendida AND {FILTRO})
            """, r => (r.GetInt64(0), r.GetInt64(1), Nulo<int?>(r, 2), r.GetInt64(3))))[0];
        var tendencia = await Lista(u, $"""
            SELECT s.fecha, round(100.0 * count(*) FILTER (WHERE {PRESENTE}) / count(*))::int
              FROM asistencias s JOIN alumnos a ON a.id = s.alumno_id JOIN grupos g ON g.id = a.grupo_id
             WHERE {FILTRO} AND extract(isodow FROM s.fecha) < 6 -- solo días de clase
             GROUP BY s.fecha ORDER BY s.fecha DESC LIMIT 7
            """, r => new DiaAsistencia(r.GetFieldValue<DateOnly>(0), r.GetInt32(1)));
        tendencia.Reverse();
        return new Resumen(conteos.Item1, conteos.Item2, conteos.Item3, conteos.Item4, tendencia);
    }

    public Task<List<Alerta>> AlertasAsync(UsuarioActual u, bool incluirAtendidas, int limite = 200) => Lista(u, $"""
        SELECT r.id, a.nombre, g.grado || '°' || g.letra, r.tipo::text, r.nivel::text, r.detalle, r.enviada, r.atendida, r.created_at
          FROM alertas_rezago r JOIN alumnos a ON a.id = r.alumno_id JOIN grupos g ON g.id = a.grupo_id
         WHERE {FILTRO} AND (@todas OR NOT r.atendida)
         ORDER BY r.atendida, r.nivel DESC, r.created_at DESC LIMIT @lim
        """, r => new Alerta(r.GetGuid(0), r.GetString(1), r.GetString(2), r.GetString(3), r.GetString(4), Nulo<string>(r, 5),
                             r.GetBoolean(6), r.GetBoolean(7), r.GetDateTime(8)),
        ("todas", incluirAtendidas), ("lim", limite));

    public Task<List<Guid>> AtenderAlertaAsync(UsuarioActual u, Guid id) => Lista(u, $"""
        UPDATE alertas_rezago r SET atendida = TRUE
          FROM alumnos a JOIN grupos g ON g.id = a.grupo_id
         WHERE r.id = @id AND a.id = r.alumno_id AND {FILTRO} RETURNING r.id
        """, r => r.GetGuid(0), ("id", id));

    // Sin grupo: solo las clases que da el usuario. Con grupo: el horario completo de ese grupo.
    public Task<List<ClaseHorario>> HorarioAsync(UsuarioActual u, string dia = "", string grupo = "") => Lista(u, $"""
        SELECT h.dia::text, to_char(h.hora_inicio, 'HH24:MI'), to_char(h.hora_fin, 'HH24:MI'), g.grado || '°' || g.letra, m.nombre, us.nombre
          FROM horarios h JOIN grupos g ON g.id = h.grupo_id JOIN materias m ON m.id = h.materia_id JOIN usuarios us ON us.id = h.docente_id
         WHERE {FILTRO} AND (@dia = '' OR h.dia::text = @dia)
           AND (@grupo = '' AND h.docente_id = @uid OR g.id::text = @grupo)
         ORDER BY h.dia, h.hora_inicio
        """, r => new ClaseHorario(r.GetString(0), r.GetString(1), r.GetString(2), r.GetString(3), r.GetString(4), r.GetString(5)),
        ("dia", dia), ("grupo", grupo));

    public Task<List<Alumno>> AlumnosAsync(UsuarioActual u, string buscar, string grupo) => Lista(u, $"""
        SELECT a.id, a.nombre, a.curp, a.tutor_nombre, a.tutor_telefono, g.grado || '°' || g.letra,
               (SELECT count(*) FROM asistencias s WHERE s.alumno_id = a.id AND s.estado = 'falta'
                   AND date_trunc('month', s.fecha) = date_trunc('month', CURRENT_DATE)),
               (SELECT round(avg(c.calificacion), 2) FROM calificaciones c WHERE c.alumno_id = a.id)
          FROM alumnos a JOIN grupos g ON g.id = a.grupo_id
         WHERE a.activo AND {FILTRO} AND (@grupo = '' OR g.id::text = @grupo)
           AND (@q = '' OR a.nombre ILIKE '%' || @q || '%' OR a.curp ILIKE '%' || @q || '%')
         ORDER BY g.grado, g.letra, a.nombre
        """, r => new Alumno(r.GetGuid(0), r.GetString(1), Nulo<string>(r, 2), Nulo<string>(r, 3), Nulo<string>(r, 4),
                             r.GetString(5), r.GetInt64(6), Nulo<decimal?>(r, 7)),
        ("q", buscar.Trim()), ("grupo", grupo));

    public Task<List<Materia>> MateriasAsync(UsuarioActual u) => Lista(u,
        "SELECT id, nombre FROM materias WHERE escuela_id = @esc ORDER BY nombre",
        r => new Materia(r.GetGuid(0), r.GetString(1)));

    // Lista del grupo con lo ya capturado. Si el grupo no es del usuario, regresa vacío.
    public Task<List<FilaCaptura>> CapturaAsync(UsuarioActual u, Guid grupo, DateOnly fecha, Guid materia, int parcial) => Lista(u, $"""
        SELECT a.id, a.nombre, s.estado::text, c.calificacion
          FROM alumnos a JOIN grupos g ON g.id = a.grupo_id
          LEFT JOIN asistencias s ON s.alumno_id = a.id AND s.fecha = @fecha
          LEFT JOIN calificaciones c ON c.alumno_id = a.id AND c.materia_id = @materia AND c.parcial = @parcial
         WHERE a.activo AND g.id = @grupo AND {FILTRO}
         ORDER BY a.nombre
        """, r => new FilaCaptura(r.GetGuid(0), r.GetString(1), Nulo<string>(r, 2), Nulo<decimal?>(r, 3)),
        ("grupo", grupo), ("fecha", fecha), ("materia", materia), ("parcial", parcial));

    public async Task GuardarAsistenciaAsync(UsuarioActual u, DateOnly fecha, IEnumerable<(Guid Alumno, string Estado)> filas)
    {
        await Transaccion(async (c, t) =>
        {
            foreach (var (alumno, estado) in filas)
                await Ejecutar(c, t, """
                    INSERT INTO asistencias (alumno_id, docente_id, fecha, estado, dispositivo_id)
                    VALUES (@a, @d, @f, @e::estado_asistencia, 'web-aspnet')
                    ON CONFLICT (alumno_id, fecha) DO UPDATE
                      SET estado = EXCLUDED.estado, docente_id = EXCLUDED.docente_id, dispositivo_id = EXCLUDED.dispositivo_id
                    """, ("a", alumno), ("d", u.Id), ("f", fecha), ("e", estado));
        });
    }

    public async Task GuardarCalificacionesAsync(UsuarioActual u, Guid materia, int parcial, IEnumerable<(Guid Alumno, decimal Valor)> filas)
    {
        await Transaccion(async (c, t) =>
        {
            foreach (var (alumno, valor) in filas)
                await Ejecutar(c, t, """
                    INSERT INTO calificaciones (alumno_id, materia_id, docente_id, parcial, calificacion)
                    VALUES (@a, @m, @d, @p, @v)
                    ON CONFLICT (alumno_id, materia_id, parcial) DO UPDATE
                      SET calificacion = EXCLUDED.calificacion, docente_id = EXCLUDED.docente_id
                    """, ("a", alumno), ("m", materia), ("d", u.Id), ("p", (short)parcial), ("v", valor));
        });
    }

    // A quién avisar: al director de la escuela y al docente titular del grupo (igual que el avance 1).
    public Task<List<(Guid Id, string ChatId, string Texto)>> AlertasPorAvisarAsync() => Lista(null, """
        SELECT r.id, u.telegram_chat_id,
               '⚠️ Alerta ' || r.nivel || ': ' || a.nombre || ' (' || g.grado || '°' || g.letra || ') - ' || coalesce(r.detalle, '')
          FROM alertas_rezago r JOIN alumnos a ON a.id = r.alumno_id JOIN grupos g ON g.id = a.grupo_id
          JOIN usuarios u ON u.escuela_id = g.escuela_id AND (u.rol = 'director' OR u.id = g.docente_id)
         WHERE NOT r.enviada AND u.telegram_chat_id IS NOT NULL
        """, r => (r.GetGuid(0), r.GetString(1), r.GetString(2)));

    public Task<List<Guid>> MarcarAvisadaAsync(Guid id) => Lista(null,
        "UPDATE alertas_rezago SET enviada = TRUE, enviada_at = NOW() WHERE id = @id RETURNING id", r => r.GetGuid(0), ("id", id));

    // Guarda todo o nada y después revisa las reglas de rezago (fn_generar_alertas de la base).
    static async Task Transaccion(Func<NpgsqlConnection, NpgsqlTransaction, Task> trabajo)
    {
        await using var c = DatabaseConnection.CreateConnection();
        await c.OpenAsync();
        await using var t = await c.BeginTransactionAsync();
        await trabajo(c, t);
        await Ejecutar(c, t, "SELECT fn_generar_alertas()");
        await t.CommitAsync();
    }

    static async Task Ejecutar(NpgsqlConnection c, NpgsqlTransaction t, string sql, params (string, object)[] ps)
    {
        await using var cmd = new NpgsqlCommand(sql, c, t);
        foreach (var (n, v) in ps) cmd.Parameters.AddWithValue(n, v);
        await cmd.ExecuteNonQueryAsync();
    }
}
