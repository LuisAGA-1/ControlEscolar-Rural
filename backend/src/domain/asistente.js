// Dominio: lo que el bot de Telegram sabe hacer por rol y cómo leer lo que Ollama responde.
// La IA solo elige una intención de esta lista; los permisos los vuelven a revisar los casos de uso.
export const INTENCIONES = {
  ayuda: { roles: ['administrador', 'docente', 'alumno'], descripcion: 'saludo, agradecimiento o algo que no está en la lista' },
  calificaciones: { roles: ['alumno'], descripcion: 'sus calificaciones parciales del periodo en curso' },
  kardex: { roles: ['alumno'], descripcion: 'su kárdex: historial de materias, créditos y promedio general' },
  constancia: {
    roles: ['alumno', 'administrador'],
    descripcion: 'una constancia en PDF; parámetro tipo: "estudios" (por defecto) o "calificaciones"',
  },
  horario: { roles: ['docente', 'alumno'], descripcion: 'sus clases de hoy o de un día; parámetro dia: lunes a viernes' },
  alertas: { roles: ['administrador', 'docente'], descripcion: 'alumnos con alertas de rezago abiertas' },
  reporte: { roles: ['administrador', 'docente'], descripcion: 'promedios y asistencia por grupo' },
  alumno: { roles: ['administrador'], descripcion: 'calificaciones de un alumno; parámetro matricula (como A260001)' },
};

export const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
const MATRICULA = /\b([A-Z]\d{6})\b/i;

export function intencionesDe(rol) {
  return Object.entries(INTENCIONES)
    .filter(([, i]) => i.roles.includes(rol))
    .map(([nombre, i]) => ({ nombre, descripcion: i.descripcion }));
}

// Instrucciones (system prompt) que n8n le pasa a Ollama junto con el mensaje del usuario.
export function instruccionesParaIa(rol) {
  const lista = intencionesDe(rol).map((i) => `- ${i.nombre}: ${i.descripcion}`).join('\n');
  return [
    `Eres el asistente de servicios escolares de una facultad. El usuario es ${rol}.`,
    'Clasifica su mensaje en UNA de estas intenciones:',
    lista,
    'Responde SOLO con JSON, sin texto extra: {"intencion": "<nombre>", "parametros": {}}.',
    'Parámetros posibles: tipo ("estudios" o "calificaciones"), dia ("lunes".."viernes", sin acentos), matricula (letra y 6 dígitos).',
    'Ejemplos: "¿cómo voy en mis materias?" → {"intencion":"calificaciones","parametros":{}};',
    '"necesito una constancia con calificaciones" → {"intencion":"constancia","parametros":{"tipo":"calificaciones"}};',
    '"qué clases tengo el miércoles" → {"intencion":"horario","parametros":{"dia":"miercoles"}}.',
    'Si no estás seguro, usa "ayuda".',
  ].join('\n');
}

// Convierte la respuesta de la IA (texto, a veces con basura alrededor) en una intención válida para ese rol.
// Si la IA falla o elige algo que el rol no tiene, el bot responde con la ayuda.
export function interpretarIntencion(rol, respuestaIa, textoUsuario = '') {
  let datos = {};
  try {
    const json = String(respuestaIa ?? '').match(/\{[\s\S]*\}/);
    datos = json ? JSON.parse(json[0]) : {};
  } catch {
    datos = {};
  }
  const nombre = String(datos.intencion ?? '').toLowerCase().trim();
  const intencion = INTENCIONES[nombre]?.roles.includes(rol) ? nombre : 'ayuda';
  const p = datos.parametros && typeof datos.parametros === 'object' ? datos.parametros : {};
  const parametros = {};
  const tipo = String(p.tipo ?? '').toLowerCase();
  parametros.tipo = (tipo || textoUsuario).toLowerCase().includes('calif') ? 'calificaciones' : 'estudios';
  const dia = String(p.dia ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (DIAS.includes(dia)) parametros.dia = dia;
  // El modelo a veces no copia la matrícula; se toma del mensaje original.
  const matricula = String(p.matricula ?? '').match(MATRICULA) ?? String(textoUsuario).match(MATRICULA);
  if (matricula) parametros.matricula = matricula[1].toUpperCase();
  return { intencion, parametros };
}

// "/vincular 123456" o "/start 123456" (enlace profundo de Telegram).
export function leerCodigoVinculacion(texto) {
  return String(texto ?? '').trim().match(/^\/(?:vincular|start)(?:@\w+)?\s+(\d{6})$/i)?.[1] ?? null;
}

// 6 dígitos a partir de texto hexadecimal aleatorio.
export const crearCodigoVinculacion = (azar) => String(parseInt(azar.slice(0, 8), 16) % 1_000_000).padStart(6, '0');
