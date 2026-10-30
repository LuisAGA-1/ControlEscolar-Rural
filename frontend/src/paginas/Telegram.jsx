import { useState } from 'react'
import { api } from '../api.js'
import { Encabezado } from '../componentes.jsx'

// Usuario del bot sin @ (VITE_BOT_TELEGRAM en frontend/.env); sin él solo se muestra el código.
const BOT = import.meta.env.VITE_BOT_TELEGRAM

const EJEMPLOS = {
  alumno: ['¿Cómo voy en mis materias?', 'Mi kárdex', 'Quiero una constancia de estudios', '¿Qué clases tengo hoy?'],
  docente: ['¿Qué clases tengo el jueves?', 'Alertas de mis grupos', 'Reporte de mis grupos'],
  administrador: ['Reporte de la facultad', 'Alertas abiertas', 'Calificaciones de A260001', 'Constancia de estudios de A260001'],
}

export default function Telegram({ usuario }) {
  const [codigo, setCodigo] = useState(null)
  const [error, setError] = useState('')

  async function generar() {
    setError('')
    try { setCodigo(await api('/telegram/codigo', {})) } catch (e) { setError(e.message) }
  }

  return (
    <>
      <Encabezado titulo="Bot de Telegram" detalle="Consulta lo mismo que en el portal escribiéndole al bot con tus palabras." />
      <div className="rejilla-tarjetas">
        <div className="tarjeta tramite">
          <span className="kpi-icono azul"><i className="bi bi-telegram" /></span>
          <h2>Vincular tu cuenta</h2>
          <p className="text-muted">Genera un código y mándaselo al bot. Vence en 10 minutos y sirve una sola vez.</p>
          <button className="btn-primario" onClick={generar}><i className="bi bi-key" /> Generar código</button>
          {error && <p className="small error" role="alert">{error}</p>}
          {codigo && (
            <div role="status">
              <p className="codigo-telegram">{codigo.codigo}</p>
              <p className="small text-muted">
                Escríbele al bot <code>/vincular {codigo.codigo}</code>
                {BOT && <> o <a href={`https://t.me/${BOT}?start=${codigo.codigo}`} target="_blank" rel="noreferrer">ábrelo aquí</a> y toca Iniciar</>}.
              </p>
            </div>
          )}
        </div>
        <div className="tarjeta tramite">
          <span className="kpi-icono morado"><i className="bi bi-chat-dots" /></span>
          <h2>Qué le puedes pedir</h2>
          <ul className="ejemplos-bot">
            {EJEMPLOS[usuario.rol].map((t) => <li key={t}>“{t}”</li>)}
          </ul>
          <p className="small text-muted">Si vinculas otra cuenta en el mismo chat, la anterior se desvincula.</p>
        </div>
      </div>
    </>
  )
}
