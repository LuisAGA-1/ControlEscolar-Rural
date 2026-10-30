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
 * @property {(docenteId: string, grupoId: string, materiaId?: string) => Promise<boolean>} imparte
 *   Si el docente da esa materia (o alguna, sin materiaId) a ese grupo en el periodo en curso.
 * @property {(usuarioId: string, r: {asistencias: object[], calificaciones: object[]}) => Promise<object>} guardarRegistros
 * @property {(c: {grupoId: string, materiaId: string, fecha: string, parcial: number}) => Promise<{asistencias: object[], calificaciones: object[]}>} registrosDeClase
 *   Lo ya capturado de una clase: la lista de esa fecha y las calificaciones de ese parcial.
 * @property {(alumnoId: string, filtro: {docenteId?: string}) => Promise<object[]>} calificacionesDelPeriodo
 * @property {(alumnoId: string) => Promise<object[]>} kardex
 * @property {(alumnoId: string) => Promise<object|undefined>} datosAlumno
 *   Nombre, matrícula, carrera, semestre, grupo, periodo y escuela, para la constancia.
 * @property {(c: {folio: string, codigo: string, alumno_id: string, tipo: string, emitida_por: string}) => Promise<void>} guardarConstancia
 * @property {(folio: string, codigo: string) => Promise<object|undefined>} buscarConstancia
 * @property {(grupoId: string) => Promise<object[]>} reporteGrupo   Por materia: docente, promedio, reprobados y asistencia.
 * @property {() => Promise<object[]>} reporteEscuela                 Por grupo: alumnos, promedio, asistencia y alertas.
 * @property {() => Promise<number>} generarAlertas
 * @property {() => Promise<object[]>} alertasPendientes
 * @property {(id: string) => Promise<void>} marcarAlertaEnviada
 * @property {(u: Usuario) => Promise<object[]>} alertasDe
 *
 * @typedef {{ enviar: (chatId: string, texto: string) => Promise<boolean> }} Notificador
 * @typedef {{ constancia: (datos: object) => Promise<Buffer> }} GeneradorPdf
 * @typedef {() => string} Azar  Texto hexadecimal aleatorio de 16 caracteres.
 * @typedef {{ firmar: (u: Usuario) => string, verificarPassword: (plano: string, hash: string) => Promise<boolean> }} Tokens
 */
export {};
