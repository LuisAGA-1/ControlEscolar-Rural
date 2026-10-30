// Aplicación: casos de uso. Reciben los puertos de salida (repo, notificador, tokens)
// por parámetro, así no dependen de PostgreSQL, Telegram ni JWT directamente.
//
// Puertos de salida que se esperan:
//   repo:        buscarUsuarioPorEmail, catalogoDeDocente, guardarRegistros, generarAlertas,
//                alertasPendientes, marcarAlertaEnviada, alertasDeDocente
//   notificador: enviar(chatId, texto)
//   tokens:      firmar(payload), verificarPassword(plano, hash)
import { validarRegistros, ErrorValidacion } from '../domain/registros.js';

export function crearCasosDeUso({ repo, notificador, tokens }) {
  async function notificarAlertas() {
    for (const a of await repo.alertasPendientes()) {
      const texto = `⚠️ Alerta ${a.nivel}: ${a.alumno} (${a.grupo}) - ${a.detalle}`;
      if (await notificador.enviar(a.chat_id, texto)) await repo.marcarAlertaEnviada(a.id);
    }
  }

  return {
    async iniciarSesion(email, password) {
      const u = await repo.buscarUsuarioPorEmail(String(email ?? '').toLowerCase().trim());
      if (!u || !u.activo || !(await tokens.verificarPassword(String(password ?? ''), u.password_hash))) {
        throw new ErrorValidacion('Correo o contraseña incorrectos');
      }
      const usuario = { id: u.id, nombre: u.nombre, rol: u.rol, escuela_id: u.escuela_id };
      return { token: tokens.firmar(usuario), usuario };
    },

    catalogo: (usuario) => repo.catalogoDeDocente(usuario),

    async guardarRegistros(usuario, cuerpo) {
      const r = await repo.guardarRegistros(usuario.id, validarRegistros(cuerpo));
      r.alertas_nuevas = await repo.generarAlertas();
      // Si Telegram falla no se pierde nada: la alerta queda con enviada=false y se reintenta.
      await notificarAlertas().catch((e) => console.error('Telegram:', e.message));
      return r;
    },

    alertas: (usuario) => repo.alertasDeDocente(usuario),
  };
}
