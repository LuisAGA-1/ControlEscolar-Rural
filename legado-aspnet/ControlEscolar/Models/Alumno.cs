namespace ControlEscolar.Models;

public record Alumno(Guid Id, string Nombre, string? Curp, string? TutorNombre, string? TutorTelefono,
                     string Grupo, long FaltasMes, decimal? Promedio);
