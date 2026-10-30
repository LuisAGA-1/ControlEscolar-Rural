// Dominio: constancias. Cada una lleva un folio legible y un código para verificarla en línea.
import { ErrorValidacion } from './registros.js';

export const TIPOS_CONSTANCIA = {
  estudios: 'Constancia de estudios',
  calificaciones: 'Constancia de calificaciones',
};

export function validarTipoConstancia(tipo) {
  if (!TIPOS_CONSTANCIA[tipo]) throw new ErrorValidacion(`tipo de constancia debe ser ${Object.keys(TIPOS_CONSTANCIA).join(' o ')}`);
  return tipo;
}

// azar: texto hexadecimal aleatorio de al menos 16 caracteres (lo da el adaptador, no el dominio).
export function crearFolio(fecha, azar) {
  return { folio: `FCA-${fecha.getFullYear()}-${azar.slice(0, 8).toUpperCase()}`, codigo: azar.slice(8, 16).toUpperCase() };
}
