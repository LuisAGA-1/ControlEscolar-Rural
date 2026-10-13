import { useEffect, useState } from 'react'
import { local, iniciarSesion, sincronizar } from './sync.js'
import { PasarLista, Calificaciones, Horario, Alertas } from './vistas.jsx'

const VISTAS = { lista: ['Asistencia', PasarLista], cal: ['Calificaciones', Calificaciones], horario: ['Horario', Horario], alertas: ['Alertas', Alertas] }

export default function App() {
  const [sesion, setSesion] = useState(local.sesion)
  const [enLinea, setEnLinea] = useState(navigator.onLine)
  const [vista, setVista] = useState('lista')
  const [aviso, setAviso] = useState('')
  const [, refrescar] = useState(0)
  const actualizar = () => refrescar((n) => n + 1)

  async function sync() {
    try {
      const r = await sincronizar()
      setAviso(r.ok ? `Sincronizado ${new Date().toLocaleTimeString()}` : '')
    } catch (e) {
      if (e.status === 401) { local.cerrarSesion(); setSesion(null) } // los registros pendientes se conservan
      setAviso('No se pudo sincronizar: ' + e.message)
    }
    actualizar()
  }

  useEffect(() => {
    const on = () => { setEnLinea(true); sync() }
    const off = () => setEnLinea(false)
    addEventListener('online', on)
    addEventListener('offline', off)
    const t = setInterval(sync, 30000)
    sync()
    return () => { removeEventListener('online', on); removeEventListener('offline', off); clearInterval(t) }
  }, [])

  if (!sesion) return <Login onEntrar={() => { setSesion(local.sesion()); sync() }} />  // sube lo que quedó pendiente de otra sesión

  const pendientes = local.pendientes()
  const Vista = VISTAS[vista][1]
  return (
    <>
      <header>
        <strong>Control Escolar Rural</strong>
        <span className={enLinea ? 'ok' : 'off'}>{enLinea ? '● En línea' : '● Sin conexión'}</span>
        <span>{pendientes ? `${pendientes} por subir` : 'Todo sincronizado'}</span>
        <button onClick={sync} disabled={!enLinea}>Sincronizar</button>
        <span className="usuario">{sesion.usuario.nombre} · <a href="#" onClick={() => { local.cerrarSesion(); setSesion(null) }}>Salir</a></span>
      </header>
      {aviso && <p className="aviso">{aviso}</p>}
      <nav>
        {Object.entries(VISTAS).map(([k, [titulo]]) => (
          <button key={k} className={k === vista ? 'activa' : ''} onClick={() => setVista(k)}>{titulo}</button>
        ))}
      </nav>
      <main><Vista onCambio={actualizar} /></main>
    </>
  )
}

function Login({ onEntrar }) {
  const [email, setEmail] = useState('maria.docente@escuela.mx')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  async function entrar(e) {
    e.preventDefault()
    setError('')
    try { await iniciarSesion(email, password); onEntrar() } catch (err) {
      setError(navigator.onLine ? err.message : 'La primera vez necesitas conexión para iniciar sesión')
    }
  }
  return (
    <form className="login" onSubmit={entrar}>
      <h1>Control Escolar Rural</h1>
      <label>Correo <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label>Contraseña <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      <button>Entrar</button>
      {error && <p className="error">{error}</p>}
    </form>
  )
}
