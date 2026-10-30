// Puertos de salida: lo que los casos de uso necesitan del exterior. Los adaptadores de
// infrastructure/ los implementan (PostgreSQL, Telegram, JWT/bcrypt); las pruebas usan versiones en memoria.

/**
 * @typedef {{ id: string, nombre: string, rol: 'administrador'|'docente'|'alumno', escuela_id: string, alumno_id?: string }} Usuario
 *
 * @typedef {object} Repositorio
 * @property {(ident: {email?: string, matricula?: string}) => Promise<object|undefined>} buscarUsuario
 *   Usuario activo o no, con password_hash y, si es alumno, alumno_id y matricula.
 * @property {(u: Usuario) => Promise<{grupos: object[], alumnos: object[], materias: object[], horarios: object[]}>} catalogo
 *   Lo que ve cada rol en el periodo en curso.
 * @property {(docenteId: string, pares: {alumno_id: string, materia_id: string}[]) => Promise<string[]>} paresQueImparte
 *   De los pares alumno|materia recibidos, los que el docente imparte en el periodo en curso.
 * @property {(docenteId: string, grupoId: string, materiaId: string) => Promise<boolean>} imparte
 *   Si el docente da esa materia a ese grupo en el periodo en curso.
 * @property {(usuarioId: string, r: {asistencias: object[], calificaciones: object[]}) => Promise<object>} guardarRegistros
 * @property {(c: {grupoId: string, materiaId: string, fecha: string, parcial: number}) => Promise<{asistencias: object[], calificaciones: object[]}>} registrosDeClase
 *   Lo ya capturado de una clase: la lista de esa fecha y las calificaciones de ese parcial.
 * @property {(alumnoId: string, filtro: {docenteId?: string}) => Promise<object[]>} calificacionesDelPeriodo
 * @property {(alumnoId: string) => Promise<object[]>} kardex
 * @property {() => Promise<number>} generarAlertas
 * @property {() => Promise<object[]>} alertasPendientes
 * @property {(id: string) => Promise<void>} marcarAlertaEnviada
 * @property {(u: Usuario) => Promise<object[]>} alertasDe
 *
 * @typedef {{ enviar: (chatId: string, texto: string) => Promise<boolean> }} Notificador
 * @typedef {{ firmar: (u: Usuario) => string, verificarPassword: (plano: string, hash: string) => Promise<boolean> }} Tokens
 */
export {};
