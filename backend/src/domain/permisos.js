// Dominio: qué puede hacer cada rol. Sin Express ni PostgreSQL.
export const ROLES = ['administrador', 'docente', 'alumno'];

export class ErrorPermiso extends Error {}

export function exigirRol(usuario, ...roles) {
  if (!roles.includes(usuario?.rol)) throw new ErrorPermiso('No tienes permiso para esta acción');
}

// El alumno solo consulta lo suyo; administrador y docente indican de qué alumno.
export function alumnoConsultado(usuario, alumnoId) {
  if (usuario.rol === 'alumno') return usuario.alumno_id;
  if (!alumnoId) throw new ErrorPermiso('Indica el alumno a consultar');
  return alumnoId;
}
