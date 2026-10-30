import { useState } from 'react'
import { Encabezado } from '../componentes.jsx'
import { TIPO_ALERTA } from '../formato.js'

export default function Alertas({ alertas }) {
  const [nivel, setNivel] = useState('todas')
  const visibles = alertas.filter((a) => nivel === 'todas' || a.nivel === nivel)
  return (
    <>
      <Encabezado titulo="Alertas de rezago" detalle="Se generan solas: 3 faltas seguidas, más de 20 % de faltas en el mes o promedio menor a 6.">
        <div className="segmentado" role="group" aria-label="Filtrar por nivel">
          {[['todas', 'Todas'], ['roja', 'Rojas'], ['amarilla', 'Amarillas']].map(([v, t]) => (
            <button key={v} className={nivel === v ? 'activo' : ''} aria-pressed={nivel === v} onClick={() => setNivel(v)}>{t}</button>
          ))}
        </div>
      </Encabezado>
      {visibles.length === 0 && <p className="vacio"><i className="bi bi-emoji-smile" /> Sin alertas abiertas.</p>}
      <div className="rejilla-tarjetas">
        {visibles.map((a) => (
          <article key={a.id} className={`alerta-tarjeta ${a.nivel} aparece`}>
            <h3>{a.alumno}</h3>
            <p className="text-muted small">{a.matricula} · {a.grupo}</p>
            <p><strong>{TIPO_ALERTA[a.tipo]}</strong>: {a.detalle}</p>
            <p className="small text-muted">
              {new Date(a.created_at).toLocaleDateString('es-MX')} · {a.enviada ? <><i className="bi bi-telegram" /> Avisada por Telegram</> : 'Pendiente de aviso'}
            </p>
          </article>
        ))}
      </div>
    </>
  )
}
