// Aplicación: casos de uso. Reciben los puertos de salida (ver puertos.js) por parámetro,
// así no dependen de PostgreSQL, Telegram ni JWT. La web y el bot llaman a los mismos casos.
import { validarRegistros, validarClase, normalizarIdentificador, ErrorValidacion } from '../domain/registros.js';
import { exigirRol, alumnoConsultado, ErrorPermiso } from '../domain/permisos.js';
import { resumirKardex } from '../domain/kardex.js';

/** @param {{ repo: import('./puertos.js').Repositorio, notificador: import('./puertos.js').Notificador, tokens: import('./puertos.js').Tokens }} puertos */
export function crearCasosDeUso({ repo, notificador, tokens }) {
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
      const usuario = { id: u.id, nombre: u.nombre, rol: u.rol, escuela_id: u.escuela_id };
      if (u.rol === 'alumno') Object.assign(usuario, { alumno_id: u.alumno_id, matricula: u.matricula });
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

    alertas(usuario) {
      exigirRol(usuario, 'administrador', 'docente');
      return repo.alertasDe(usuario);
    },
  };
}
