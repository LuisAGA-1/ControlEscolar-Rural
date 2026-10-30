// Aplicación: casos de uso. Reciben los puertos de salida (ver puertos.js) por parámetro,
// así no dependen de PostgreSQL, Telegram ni JWT. La web y el bot llaman a los mismos casos.
import { validarRegistros, validarClase, normalizarIdentificador, ErrorValidacion } from '../domain/registros.js';
import { exigirRol, alumnoConsultado, ErrorPermiso } from '../domain/permisos.js';
import { resumirKardex } from '../domain/kardex.js';
import { TIPOS_CONSTANCIA, validarTipoConstancia, crearFolio } from '../domain/constancias.js';
import { crearCodigoVinculacion } from '../domain/asistente.js';

const VIGENCIA_CODIGO_MIN = 10;

// Lo que viaja en el token y lo que el bot usa como "sesión" del chat.
function sesionDe(u) {
  const usuario = { id: u.id, nombre: u.nombre, rol: u.rol, escuela_id: u.escuela_id };
  if (u.rol === 'alumno') Object.assign(usuario, { alumno_id: u.alumno_id, matricula: u.matricula });
  return usuario;
}

/**
 * @param {{ repo: import('./puertos.js').Repositorio, notificador: import('./puertos.js').Notificador,
 *   tokens: import('./puertos.js').Tokens, pdf: import('./puertos.js').GeneradorPdf, azar: import('./puertos.js').Azar,
 *   reloj?: () => Date }} puertos
 */
export function crearCasosDeUso({ repo, notificador, tokens, pdf, azar, reloj = () => new Date() }) {
  async function notificarAlertas() {
    for (const a of await repo.alertasPendientes()) {
      const texto = `⚠️ Alerta ${a.nivel}: ${a.alumno} (${a.grupo}) - ${a.detalle}`;
      if (await notificador.enviar(a.chat_id, texto)) await repo.marcarAlertaEnviada(a.id);
    }
  }

  return {
    async iniciarSesion(identificador, password) {
      const u = await repo.buscarUsuario(normalizarIdentificador(identificador));
      if (!u || !u.activo || !(await tokens.verificarPassword(String(password ?? ''), u.password_hash))) {
        throw new ErrorValidacion('Usuario o contraseña incorrectos');
      }
      const usuario = sesionDe(u);
      return { token: tokens.firmar(usuario), usuario };
    },

    catalogo: (usuario) => repo.catalogo(usuario),

    async guardarRegistros(usuario, cuerpo) {
      exigirRol(usuario, 'administrador', 'docente');
      const registros = validarRegistros(cuerpo);
      if (usuario.rol === 'docente') {
        const clave = (r) => `${r.alumno_id}|${r.materia_id}`;
        const pares = [...registros.asistencias, ...registros.calificaciones];
        const permitidos = new Set(await repo.paresQueImparte(usuario.id, pares));
        if (!pares.every((p) => permitidos.has(clave(p)))) {
          throw new ErrorPermiso('Solo puedes capturar en las materias y grupos que impartes');
        }
      }
      const r = await repo.guardarRegistros(usuario.id, registros);
      r.alertas_nuevas = await repo.generarAlertas();
      // Si Telegram falla no se pierde nada: la alerta queda con enviada=false y se reintenta.
      await notificarAlertas().catch((e) => console.error('Telegram:', e.message));
      return r;
    },

    // Lo capturado de una clase (lista de una fecha y calificaciones de un parcial), para editarlo.
    async registrosDeClase(usuario, consulta) {
      exigirRol(usuario, 'administrador', 'docente');
      const clase = validarClase(consulta);
      if (usuario.rol === 'docente' && !(await repo.imparte(usuario.id, clase.grupoId, clase.materiaId))) {
        throw new ErrorPermiso('Solo puedes ver las materias y grupos que impartes');
      }
      return repo.registrosDeClase(clase);
    },

    // Parciales del periodo en curso. El docente solo ve las materias que imparte a ese alumno.
    calificaciones(usuario, alumnoId) {
      const id = alumnoConsultado(usuario, alumnoId);
      return repo.calificacionesDelPeriodo(id, { docenteId: usuario.rol === 'docente' ? usuario.id : undefined });
    },

    async kardex(usuario, alumnoId) {
      exigirRol(usuario, 'administrador', 'alumno');
      return resumirKardex(await repo.kardex(alumnoConsultado(usuario, alumnoId)));
    },

    // El alumno pide las suyas; administración las emite para cualquier alumno.
    async emitirConstancia(usuario, { tipo, alumno_id }) {
      exigirRol(usuario, 'administrador', 'alumno');
      validarTipoConstancia(tipo);
      const alumnoId = alumnoConsultado(usuario, alumno_id);
      const alumno = await repo.datosAlumno(alumnoId);
      if (!alumno) throw new ErrorValidacion('El alumno no existe');
      const fecha = reloj();
      const { folio, codigo } = crearFolio(fecha, azar());
      const kardex = tipo === 'calificaciones' ? resumirKardex(await repo.kardex(alumnoId)) : null;
      const parciales = tipo === 'calificaciones' ? await repo.calificacionesDelPeriodo(alumnoId, {}) : null;
      await repo.guardarConstancia({ folio, codigo, alumno_id: alumnoId, tipo, emitida_por: usuario.id });
      const archivo = await pdf.constancia({ titulo: TIPOS_CONSTANCIA[tipo], tipo, folio, codigo, fecha, alumno, kardex, parciales });
      return { folio, codigo, archivo };
    },

    // Público: cualquiera con el folio y el código impresos comprueba que la constancia es auténtica.
    async verificarConstancia(folio, codigo) {
      const c = await repo.buscarConstancia(String(folio ?? '').trim().toUpperCase(), String(codigo ?? '').trim().toUpperCase());
      return c ? { valida: true, folio: c.folio, tipo: TIPOS_CONSTANCIA[c.tipo], alumno: c.alumno, matricula: c.matricula, carrera: c.carrera, emitida: c.created_at } : { valida: false };
    },

    async reporteGrupo(usuario, grupoId) {
      exigirRol(usuario, 'administrador', 'docente');
      if (usuario.rol === 'docente' && !(await repo.imparte(usuario.id, grupoId))) {
        throw new ErrorPermiso('Solo puedes ver los reportes de tus grupos');
      }
      return repo.reporteGrupo(grupoId);
    },

    reporteEscuela(usuario) {
      exigirRol(usuario, 'administrador');
      return repo.reporteEscuela();
    },

    alertas(usuario) {
      exigirRol(usuario, 'administrador', 'docente');
      return repo.alertasDe(usuario);
    },

    // Administración busca a un alumno por matrícula (el bot no maneja ids).
    async alumnoPorMatricula(usuario, matricula) {
      exigirRol(usuario, 'administrador');
      const u = await repo.buscarUsuario({ matricula: String(matricula ?? '').toUpperCase() });
      if (!u?.alumno_id) throw new ErrorValidacion(`No hay un alumno con la matrícula ${matricula ?? ''}`);
      return { alumno_id: u.alumno_id, nombre: u.nombre, matricula: u.matricula };
    },

    // Telegram: el usuario pide un código en el portal y se lo manda al bot con /vincular.
    async codigoTelegram(usuario) {
      const codigo = crearCodigoVinculacion(azar());
      const expira = new Date(reloj().getTime() + VIGENCIA_CODIGO_MIN * 60_000);
      await repo.guardarVinculacion(usuario.id, codigo, expira);
      return { codigo, expira, minutos: VIGENCIA_CODIGO_MIN };
    },

    async vincularTelegram(chatId, codigo) {
      const usuarioId = await repo.consumirVinculacion(String(codigo ?? ''), reloj());
      if (!usuarioId) throw new ErrorValidacion('El código no existe o ya venció. Genera otro en el portal.');
      await repo.asignarChat(usuarioId, String(chatId));
      return this.usuarioDeTelegram(chatId);
    },

    async usuarioDeTelegram(chatId) {
      const u = chatId == null ? undefined : await repo.buscarUsuario({ chatId: String(chatId) });
      return u?.activo ? sesionDe(u) : null;
    },
  };
}
