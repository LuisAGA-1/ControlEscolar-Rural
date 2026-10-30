// Cliente de la API. Solo la sesión se recuerda en el navegador; los datos siempre vienen del servidor.
const vacio = () => ({ catalogo: { grupos: [], alumnos: [], materias: [], horarios: [] }, alertas: [], registros: { asis: {}, cal: {} } })
let datos = vacio()

export const hoy = () => new Date().toLocaleDateString('en-CA') // AAAA-MM-DD en hora local

export const local = {
  sesion() {
    try { return JSON.parse(localStorage.getItem('sesion')) } catch { return null }
  },
  catalogo: () => datos.catalogo,
  alertas: () => datos.alertas,
  registros: () => datos.registros, // shortcut: solo lo capturado en esta sesión; en la Fase 2 se consulta al servidor
  cerrarSesion() {
    datos = vacio()
    try { localStorage.removeItem('sesion') } catch { /* sin almacenamiento: la sesión vivía solo en memoria */ }
  },
}

async function api(ruta, opciones = {}) {
  const r = await fetch('/api' + ruta, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${local.sesion()?.token}` },
  })
  const cuerpo = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(cuerpo.error || `Error ${r.status}`), { status: r.status })
  return cuerpo
}

export async function iniciarSesion(email, password) {
  const sesion = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  localStorage.setItem('sesion', JSON.stringify(sesion))
}

export async function cargar() {
  const [catalogo, alertas] = await Promise.all([api('/catalogo'), api('/alertas')])
  datos = { ...datos, catalogo, alertas }
}

// Guarda en el servidor; si falla, lanza el error y no se marca como guardado.
export async function registrar(tipo, clave, registro) {
  const cuerpo = tipo === 'asis' ? { asistencias: [registro] } : { calificaciones: [registro] }
  await api('/registros', { method: 'POST', body: JSON.stringify(cuerpo) })
  datos.registros[tipo][clave] = registro
  datos.alertas = await api('/alertas')
}
