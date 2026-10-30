// Textos de pantalla compartidos por las páginas.
const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

export const DIAS_CLASE = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
export const hoy = () => new Date().toLocaleDateString('en-CA') // AAAA-MM-DD en hora local
export const diaDeHoy = () => DIAS[new Date().getDay()]
export const nombreDia = (d) => (d === 'miercoles' ? 'Miércoles' : d[0].toUpperCase() + d.slice(1))
export const fechaLarga = () => {
  const t = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return t[0].toUpperCase() + t.slice(1)
}
export const saludo = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}
export const iniciales = (nombre) => nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')
export const nombreGrupo = (g) => `${g.semestre}°${g.letra} ${g.carrera}`
export const ROL = { administrador: 'Administración', docente: 'Docente', alumno: 'Alumno' }
export const TIPO_ALERTA = { faltas_consecutivas: 'Faltas consecutivas', inasistencia_mensual: 'Inasistencia mensual', bajo_promedio: 'Bajo promedio' }
export const ESTADOS = [['presente', 'P', 'Presente'], ['falta', 'F', 'Falta'], ['retardo', 'R', 'Retardo'], ['justificada', 'J', 'Justificada']]
export const promedio = (valores) =>
  valores.length ? Math.round((valores.reduce((s, v) => s + Number(v), 0) / valores.length) * 10) / 10 : null
