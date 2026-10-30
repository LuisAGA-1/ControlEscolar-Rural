// Dominio: reglas del kárdex. Una materia se aprueba con 6 o más.
export const CALIFICACION_APROBATORIA = 6;

export function resumirKardex(materias) {
  const aprobadas = materias.filter((m) => Number(m.calificacion) >= CALIFICACION_APROBATORIA);
  const suma = materias.reduce((s, m) => s + Number(m.calificacion), 0);
  return {
    materias,
    cursadas: materias.length,
    aprobadas: aprobadas.length,
    creditos: aprobadas.reduce((s, m) => s + Number(m.creditos), 0),
    promedio: materias.length ? Math.round((suma / materias.length) * 100) / 100 : null,
  };
}
