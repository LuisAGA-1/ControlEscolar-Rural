namespace ControlEscolar.Models;

// Filas de las tablas de control_escolar (ids UUID, ver database/001_schema.sql del avance 1).
public record Grupo(Guid Id, int Grado, string Letra, string Ciclo, long Alumnos, long ListaHoy)
{
    public string Nombre => $"{Grado}°{Letra}";
}

public record ClaseHorario(string Dia, string Inicio, string Fin, string Grupo, string Materia, string Docente);

public record Alerta(Guid Id, string Alumno, string Grupo, string Tipo, string Nivel, string? Detalle,
                     bool Enviada, bool Atendida, DateTime Fecha);

public record FilaCaptura(Guid AlumnoId, string Alumno, string? Estado, decimal? Calificacion);

public record DiaAsistencia(DateOnly Fecha, int Porcentaje);

public record Resumen(long Alumnos, long Grupos, int? AsistenciaHoy, long AlertasAbiertas, List<DiaAsistencia> Tendencia);
