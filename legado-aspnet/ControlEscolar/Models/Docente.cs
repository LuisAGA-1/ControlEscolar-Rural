namespace ControlEscolar.Models;

// Usuario con sesión iniciada (docente, director o admin), tomado de la tabla usuarios.
public record UsuarioActual(Guid Id, string Nombre, string Email, string Rol, Guid EscuelaId);
