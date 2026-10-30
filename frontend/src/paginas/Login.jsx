import { useState } from 'react'
import { iniciarSesion } from '../api.js'

export default function Login({ onEntrar }) {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [ver, setVer] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try { await iniciarSesion(usuario, password); onEntrar() } catch (err) { setError(err.message) } finally { setEnviando(false) }
  }

  return (
    <div className="login">
      <section className="login-portada">
        <div className="marca">
          <span className="escudo"><i className="bi bi-mortarboard-fill" /></span>
          <span><strong>Control Escolar</strong><small>Facultad de Contaduría y Administración</small></span>
        </div>
        <div className="login-mensaje">
          <h1>Tus calificaciones, constancias y reportes en un solo lugar.</h1>
          <p>Portal para administradores, docentes y alumnos. También disponible en Telegram.</p>
          <ul>
            <li><i className="bi bi-journal-text" /> Calificaciones por parcial y kárdex</li>
            <li><i className="bi bi-file-earmark-text" /> Constancias de estudios</li>
            <li><i className="bi bi-telegram" /> Consultas desde el bot de Telegram</li>
          </ul>
        </div>
        <small className="text-muted">Periodo 2026-2</small>
      </section>

      <section className="login-panel">
        <form className="login-tarjeta" onSubmit={entrar}>
          <h2>Iniciar sesión</h2>
          <p className="text-muted">Alumnos: entra con tu matrícula. Personal: con tu correo institucional.</p>
          {error && <p className="error" role="alert"><i className="bi bi-exclamation-circle" /> {error}</p>}
          <label htmlFor="usuario">Matrícula o correo</label>
          <div className="campo">
            <i className="bi bi-person" />
            <input id="usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="A260001 o nombre@escuela.mx" autoComplete="username" required autoFocus />
          </div>
          <label htmlFor="password">Contraseña</label>
          <div className="campo">
            <i className="bi bi-lock" />
            <input id="password" type={ver ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            <button type="button" className="boton-icono" aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setVer(!ver)}>
              <i className={`bi ${ver ? 'bi-eye-slash' : 'bi-eye'}`} />
            </button>
          </div>
          <button className="btn-primario ancho" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'} <i className="bi bi-arrow-right" /></button>
          <p className="text-muted small">¿Olvidaste tu contraseña? Solicítala en servicios escolares.</p>
        </form>
      </section>
    </div>
  )
}
