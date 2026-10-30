// Adaptador de entrada: el bot de Telegram (vía n8n). Igual que la web, solo llama a los casos de uso;
// aquí se decide qué caso corre cada intención y cómo se ve la respuesta en el chat.
import { instruccionesParaIa, interpretarIntencion, leerCodigoVinculacion, DIAS } from '../../domain/asistente.js';
import { ErrorValidacion } from '../../domain/registros.js';
import { ErrorPermiso } from '../../domain/permisos.js';

const MAX_INTENTOS = 5; // códigos equivocados por chat y por hora, contra quien adivina códigos
const NOMBRE_DIA = { lunes: 'lunes', martes: 'martes', miercoles: 'miércoles', jueves: 'jueves', viernes: 'viernes' };
const n = (v, dec = 1) => (v == null ? '-' : Number(v).toFixed(dec));

const AYUDA = {
  alumno: ['"¿Cómo voy en mis materias?"', '"Mi kárdex"', '"Quiero una constancia de estudios"', '"Constancia con calificaciones"', '"¿Qué clases tengo hoy?"'],
  docente: ['"¿Qué clases tengo el jueves?"', '"Alertas de mis grupos"', '"Reporte de mis grupos"'],
  administrador: ['"Reporte de la facultad"', '"Alertas abiertas"', '"Calificaciones de A260001"', '"Constancia de estudios de A260001"'],
};

export function crearAsistente({ casos, reloj = () => new Date() }) {
  const fallos = new Map(); // chat_id → { n, desde }
  // shortcut: contador en memoria, se reinicia con el servidor; pasarlo a la base si hay varias instancias.
  function bloqueado(chatId) {
    const f = fallos.get(chatId);
    if (f && reloj() - f.desde > 3_600_000) fallos.delete(chatId);
    return (fallos.get(chatId)?.n ?? 0) >= MAX_INTENTOS;
  }
  const fallo = (chatId) => {
    const f = fallos.get(chatId) ?? { n: 0, desde: reloj() };
    fallos.set(chatId, { ...f, n: f.n + 1 });
  };

  async function vincular(chatId, codigo) {
    if (bloqueado(chatId)) return 'Demasiados intentos. Espera una hora y genera un código nuevo en el portal.';
    try {
      const u = await casos.vincularTelegram(chatId, codigo);
      fallos.delete(chatId);
      return `✅ Listo, ${u.nombre}. Tu cuenta quedó vinculada.\n\n${ayuda(u)}`;
    } catch (e) {
      if (!(e instanceof ErrorValidacion)) throw e;
      fallo(chatId);
      return e.message;
    }
  }

  function ayuda(u) {
    return `Puedes escribirme con tus palabras, por ejemplo:\n${AYUDA[u.rol].map((t) => `• ${t}`).join('\n')}`;
  }

  async function horario(u, dia) {
    const hoy = ['domingo', ...DIAS, 'sabado'][reloj().getDay()];
    const elegido = dia ?? (DIAS.includes(hoy) ? hoy : 'lunes');
    const { horarios, grupos } = await casos.catalogo(u);
    const grupo = Object.fromEntries(grupos.map((g) => [g.id, `${g.semestre}°${g.letra} ${g.carrera}`]));
    const clases = horarios.filter((h) => h.dia === elegido);
    const titulo = !dia && elegido !== hoy ? 'Hoy no hay clases. El lunes' : `El ${NOMBRE_DIA[elegido]}`;
    if (!clases.length) return `${titulo} no tienes clases.`;
    const linea = (h) => `${h.hora_inicio}-${h.hora_fin} ${h.materia}` + (u.rol === 'docente' ? ` (${grupo[h.grupo_id]})` : ` · ${h.docente}`);
    return `🗓️ ${titulo} tienes:\n${clases.map(linea).join('\n')}`;
  }

  function textoCalificaciones(filas, encabezado) {
    if (!filas.length) return `${encabezado}\nAún no hay calificaciones capturadas en este periodo.`;
    const porMateria = new Map();
    for (const f of filas) porMateria.set(f.materia, [...(porMateria.get(f.materia) ?? []), `P${f.parcial}: ${n(f.calificacion)}`]);
    return `${encabezado}\n${[...porMateria].map(([m, p]) => `• ${m}\n   ${p.join(' · ')}`).join('\n')}`;
  }

  async function alertas(u) {
    const lista = await casos.alertas(u);
    if (!lista.length) return '✅ No hay alertas abiertas.';
    const linea = (a) => `${a.nivel === 'roja' ? '🔴' : '🟡'} ${a.alumno} (${a.grupo}): ${a.detalle}`;
    const resto = lista.length > 15 ? `\n…y ${lista.length - 15} más en el portal.` : '';
    return `⚠️ ${lista.length} alertas abiertas:\n${lista.slice(0, 15).map(linea).join('\n')}${resto}`;
  }

  async function reporte(u) {
    if (u.rol === 'administrador') {
      const filas = await casos.reporteEscuela(u);
      const linea = (g) => `${g.grupo}: ${g.alumnos} alumnos · prom ${n(g.promedio)} · asist ${n(g.asistencia, 0)}% · ${g.alertas} alertas`;
      return `📊 Facultad, periodo en curso:\n${filas.map(linea).join('\n')}`;
    }
    const { grupos } = await casos.catalogo(u);
    const bloques = [];
    for (const g of grupos) {
      const suyas = (await casos.reporteGrupo(u, g.id)).filter((m) => m.docente === u.nombre);
      const linea = (m) => `• ${m.materia}: prom ${n(m.promedio)} · ${m.reprobados} reprobados · asist ${n(m.asistencia, 0)}%`;
      bloques.push(`${g.semestre}°${g.letra} ${g.carrera}\n${suyas.map(linea).join('\n')}`);
    }
    return `📊 Tus grupos, periodo en curso:\n\n${bloques.join('\n\n')}`;
  }

  async function constancia(u, { tipo, matricula }) {
    let alumnoId;
    if (u.rol === 'administrador') {
      if (!matricula) return 'Dime la matrícula del alumno, por ejemplo: "constancia de estudios de A260001".';
      alumnoId = (await casos.alumnoPorMatricula(u, matricula)).alumno_id;
    }
    const c = await casos.emitirConstancia(u, { tipo, alumno_id: alumnoId });
    return {
      texto: `📄 Constancia de ${tipo}. Folio ${c.folio}, código ${c.codigo}.`,
      archivo: { nombre: `constancia-${c.folio}.pdf`, base64: c.archivo.toString('base64') },
    };
  }

  async function ejecutar(u, intencion, p) {
    switch (intencion) {
      case 'calificaciones':
        return textoCalificaciones(await casos.calificaciones(u), '📚 Tus calificaciones del periodo:');
      case 'kardex': {
        const k = await casos.kardex(u);
        if (!k.cursadas) return 'Tu kárdex aún no tiene materias de periodos cerrados.';
        return `🎓 Kárdex de ${u.nombre} (${u.matricula}):\nMaterias cursadas: ${k.cursadas}\nAprobadas: ${k.aprobadas}\nCréditos: ${k.creditos}\nPromedio general: ${n(k.promedio, 2)}`;
      }
      case 'constancia':
        return constancia(u, p);
      case 'horario':
        return horario(u, p.dia);
      case 'alertas':
        return alertas(u);
      case 'reporte':
        return reporte(u);
      case 'alumno': {
        if (!p.matricula) return 'Dime la matrícula, por ejemplo: "calificaciones de A260001".';
        const a = await casos.alumnoPorMatricula(u, p.matricula);
        return textoCalificaciones(await casos.calificaciones(u, a.alumno_id), `📚 ${a.nombre} (${a.matricula}):`);
      }
      default:
        return `Hola, ${u.nombre.split(' ')[0]}. ${ayuda(u)}`;
    }
  }

  return {
    // Paso 1 del flujo: ¿quién escribe? Si hace falta la IA, devuelve sus instrucciones; si no, la respuesta.
    async contexto({ chat_id, texto }) {
      const codigo = leerCodigoVinculacion(texto);
      if (codigo) return { listo: true, texto: await vincular(String(chat_id), codigo) };
      const u = await casos.usuarioDeTelegram(chat_id);
      if (!u) {
        return {
          listo: true,
          texto: 'Hola. Para usar el bot vincula tu cuenta: entra al portal, abre "Telegram" y manda aquí el código, así: /vincular 123456',
        };
      }
      if (/^\/(start|ayuda|help)\b/i.test(String(texto ?? '').trim())) return { listo: true, texto: `Hola, ${u.nombre}. ${ayuda(u)}` };
      return { listo: false, rol: u.rol, instrucciones: instruccionesParaIa(u.rol) };
    },

    // Paso 2: con lo que eligió la IA, corre el caso de uso y arma el mensaje (y el PDF si lo hay).
    async responder({ chat_id, texto, ia }) {
      const u = await casos.usuarioDeTelegram(chat_id);
      if (!u) return { texto: 'Tu chat ya no está vinculado. Genera un código en el portal y mándalo con /vincular.' };
      const { intencion, parametros } = interpretarIntencion(u.rol, ia, texto);
      try {
        const r = await ejecutar(u, intencion, parametros);
        return { intencion, ...(typeof r === 'string' ? { texto: r } : r) };
      } catch (e) {
        if (e instanceof ErrorValidacion || e instanceof ErrorPermiso) return { intencion, texto: e.message };
        throw e;
      }
    },
  };
}
