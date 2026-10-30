import { useEffect, useState } from 'react'
import { local, iniciarSesion, cargar } from './api.js'
import { PasarLista, Calificaciones, Horario, Alertas } from './vistas.jsx'

const VISTAS = { lista: ['Asistencia', PasarLista], cal: ['Calificaciones', Calificaciones], horario: ['Horario', Horario], alertas: ['Alertas', Alertas] }

export default function App() {
  const [sesion, setSesion] = useState(local.sesion)
  const [vista, setVista] = useState('lista')
  const [aviso, setAviso] = useState('')
  const [, refrescar] = useState(0)

  function salir() { local.cerrarSesion(); setSesion(null) }

  // Tras cada guardado: muestra el error si lo hubo y vuelve a pintar.
  function actualizar(error) {
    setAviso(error ? 'No se guardó: ' + error : '')
    refrescar((n) => n + 1)
  }

  useEffect(() => {
    if (!sesion) return
    cargar().then(() => actualizar(), (e) => (e.status === 401 ? salir() : setAviso('No se pudo cargar: ' + e.message)))
  }, [sesion])

  if (!sesion) return <Login onEntrar={() => setSesion(local.sesion())} />

  const Vista = VISTAS[vista][1]
  return (
    <>
      <header>
        <strong>Control Escolar</strong>
        <span className="usuario">{sesion.usuario.nombre} · <a href="#" onClick={salir}>Salir</a></span>
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
    try { await iniciarSesion(email, password); onEntrar() } catch (err) { setError(err.message) }
  }
  return (
    <form className="login" onSubmit={entrar}>
      <h1>Control Escolar</h1>
      <label>Correo <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label>Contraseña <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      <button>Entrar</button>
      {error && <p className="error">{error}</p>}
    </form>
  )
}
