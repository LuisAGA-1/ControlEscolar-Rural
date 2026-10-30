// Dominio: reglas de negocio puras, sin Express ni PostgreSQL.
const ESTADOS = ['presente', 'falta', 'retardo', 'justificada'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MATRICULA = /^[A-Z]\d{6}$/;

export class ErrorValidacion extends Error {}

function exigir(cond, msg) {
  if (!cond) throw new ErrorValidacion(msg);
}

export function validarAsistencia(a) {
  exigir(UUID.test(a?.alumno_id ?? '') && UUID.test(a.materia_id ?? ''), 'asistencia: alumno_id o materia_id inválido');
  exigir(FECHA.test(a.fecha ?? ''), 'asistencia: fecha debe ser AAAA-MM-DD');
  exigir(ESTADOS.includes(a.estado), `asistencia: estado debe ser ${ESTADOS.join(', ')}`);
  return { alumno_id: a.alumno_id, materia_id: a.materia_id, fecha: a.fecha, estado: a.estado, observacion: a.observacion?.slice(0, 200) || null };
}

export function validarCalificacion(c) {
  exigir(UUID.test(c?.alumno_id ?? '') && UUID.test(c.materia_id ?? ''), 'calificación: alumno_id o materia_id inválido');
  exigir([1, 2, 3].includes(Number(c.parcial)), 'calificación: parcial debe ser 1, 2 o 3');
  const valor = Number(c.calificacion);
  exigir(Number.isFinite(valor) && valor >= 0 && valor <= 10, 'calificación: debe estar entre 0 y 10');
  return { alumno_id: c.alumno_id, materia_id: c.materia_id, parcial: Number(c.parcial), calificacion: valor };
}

export function validarRegistros(r) {
  return {
    asistencias: (r?.asistencias ?? []).map(validarAsistencia),
    calificaciones: (r?.calificaciones ?? []).map(validarCalificacion),
  };
}

export function validarClase(c) {
  exigir(UUID.test(c?.grupo_id ?? '') && UUID.test(c.materia_id ?? ''), 'clase: grupo_id o materia_id inválido');
  exigir(FECHA.test(c.fecha ?? ''), 'clase: fecha debe ser AAAA-MM-DD');
  exigir([1, 2, 3].includes(Number(c.parcial)), 'clase: parcial debe ser 1, 2 o 3');
  return { grupoId: c.grupo_id, materiaId: c.materia_id, fecha: c.fecha, parcial: Number(c.parcial) };
}

// Los alumnos entran con su matrícula (A260001); los demás, con su correo.
export function normalizarIdentificador(texto) {
  const t = String(texto ?? '').trim();
  return MATRICULA.test(t.toUpperCase()) ? { matricula: t.toUpperCase() } : { email: t.toLowerCase() };
}
