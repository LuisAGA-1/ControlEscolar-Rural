// Cliente de la API. Solo la sesión se recuerda en el navegador; los datos siempre vienen del servidor.
import { useCallback, useEffect, useState } from 'react'

export const sesion = {
  leer() {
    try { return JSON.parse(localStorage.getItem('sesion')) } catch { return null }
  },
  guardar(s) {
    try { localStorage.setItem('sesion', JSON.stringify(s)) } catch { /* sin almacenamiento: dura lo que la pestaña */ }
  },
  borrar() {
    try { localStorage.removeItem('sesion') } catch { /* nada que borrar */ }
  },
}

// GET si no hay cuerpo, POST si lo hay. Lanza Error con .status; un 401 avisa a App para volver al login.
export async function api(ruta, cuerpo) {
  const r = await fetch('/api' + ruta, {
    method: cuerpo ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sesion.leer()?.token}` },
    body: cuerpo && JSON.stringify(cuerpo),
  })
  const datos = await r.json().catch(() => ({}))
  if (r.status === 401) dispatchEvent(new Event('sesion-vencida'))
  if (!r.ok) throw Object.assign(new Error(datos.error || `Error ${r.status}`), { status: r.status })
  return datos
}

// POST que responde un archivo (la constancia en PDF): lo descarga en el navegador.
export async function descargar(ruta, cuerpo) {
  const r = await fetch('/api' + ruta, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sesion.leer()?.token}` },
    body: JSON.stringify(cuerpo),
  })
  if (r.status === 401) dispatchEvent(new Event('sesion-vencida'))
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Error ${r.status}`)
  const nombre = /filename="?([^"]+)"?/.exec(r.headers.get('content-disposition') ?? '')?.[1] ?? 'constancia.pdf'
  const enlace = Object.assign(document.createElement('a'), { href: URL.createObjectURL(await r.blob()), download: nombre })
  enlace.click()
  URL.revokeObjectURL(enlace.href)
  return nombre
}

export async function iniciarSesion(usuario, password) {
  sesion.guardar(await api('/auth/login', { usuario, password }))
}

// Carga una ruta y la vuelve a pedir cuando cambia. Con ruta null no pide nada.
export function useApi(ruta) {
  const [estado, setEstado] = useState({ datos: null, error: '', ruta: null })
  const recargar = useCallback(() => {
    if (!ruta) return
    api(ruta).then((datos) => setEstado({ datos, error: '', ruta }), (e) => setEstado({ datos: null, error: e.message, ruta }))
  }, [ruta])
  useEffect(recargar, [recargar])
  // Mientras llega la ruta nueva no se muestran los datos de la anterior.
  return { ...(estado.ruta === ruta ? estado : { datos: null, error: '' }), recargar }
}
