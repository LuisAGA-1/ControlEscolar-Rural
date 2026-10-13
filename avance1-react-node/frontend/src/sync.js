// Almacén local (funciona sin internet) y cola de sincronización con la API.
// shortcut: usa localStorage (~5 MB, suficiente para una escuela); si crece, pasar a IndexedDB (Dexie).
const leer = (k, d) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d }
}
const guardar = (k, v) => localStorage.setItem(k, JSON.stringify(v))
const vacio = () => ({ asis: {}, cal: {} })

export const uuid = () =>
  crypto.randomUUID?.() ?? // randomUUID solo existe en https/localhost; el respaldo sirve por IP de la red local
  '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16))

export const hoy = () => new Date().toLocaleDateString('en-CA') // AAAA-MM-DD en hora local

if (!localStorage.getItem('dispositivo_id')) guardar('dispositivo_id', 'web-' + uuid().slice(0, 8))

export const local = {
  sesion: () => leer('sesion', null),
  catalogo: () => leer('catalogo', { grupos: [], alumnos: [], materias: [], horarios: [] }),
  alertas: () => leer('alertas', []),
  registros: () => leer('registros', vacio()),
  pendientes() {
    const p = leer('pendientes', vacio()), l = leer('lote', null)
    return Object.keys(p.asis).length + Object.keys(p.cal).length + (l ? l.asistencias.length + l.calificaciones.length : 0)
  },
  cerrarSesion: () => ['sesion', 'catalogo', 'alertas'].forEach((k) => localStorage.removeItem(k)),
}

// Guarda un registro en el dispositivo y lo encola para subirlo.
export function registrar(tipo, clave, datos) {
  for (const k of ['registros', 'pendientes']) {
    const m = leer(k, vacio())
    m[tipo][clave] = datos
    guardar(k, m)
  }
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
  guardar('sesion', await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }))
  await descargar()
}

async function descargar() {
  guardar('catalogo', await api('/catalogo'))
  guardar('alertas', await api('/alertas'))
}

let enCurso = null
export function sincronizar() {
  enCurso ??= subir().finally(() => (enCurso = null))
  return enCurso
}

async function subir() {
  if (!navigator.onLine || !local.sesion()) return { ok: false, motivo: 'sin conexión' }
  let lote = leer('lote', null)
  const p = leer('pendientes', vacio())
  if (!lote && Object.keys(p.asis).length + Object.keys(p.cal).length > 0) {
    // El id del lote se fija antes de enviarlo: si se corta la red, el reintento manda el mismo
    // lote y el servidor lo ignora en vez de duplicarlo.
    lote = { id: uuid(), dispositivo_id: leer('dispositivo_id'), asistencias: Object.values(p.asis), calificaciones: Object.values(p.cal) }
    guardar('lote', lote)
    guardar('pendientes', vacio())
  }
  if (lote) {
    await api('/sync/lote', { method: 'POST', body: JSON.stringify(lote) })
    localStorage.removeItem('lote')
  }
  await descargar()
  return { ok: true }
}

// Alerta temprana sin internet: 3 o más faltas en los últimos registros del alumno en este dispositivo.
export function alertasLocales(alumnos) {
  const porAlumno = {}
  for (const a of Object.values(local.registros().asis)) (porAlumno[a.alumno_id] ??= []).push(a)
  return alumnos.flatMap((al) => {
    const dias = (porAlumno[al.id] ?? []).sort((x, y) => y.fecha.localeCompare(x.fecha))
    const racha = dias.findIndex((d) => d.estado !== 'falta')
    const seguidas = racha === -1 ? dias.length : racha
    return seguidas >= 3 ? [{ alumno: al.nombre, detalle: `${seguidas} faltas seguidas` }] : []
  })
}
