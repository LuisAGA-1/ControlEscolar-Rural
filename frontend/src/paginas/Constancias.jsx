import { useState } from 'react'
import { descargar } from '../api.js'
import { Encabezado } from '../componentes.jsx'

const TIPOS = [
  ['estudios', 'Constancia de estudios', 'Acredita que estás inscrito(a) en el periodo, con tu semestre y grupo.', 'bi-file-earmark-text'],
  ['calificaciones', 'Constancia de calificaciones', 'Incluye tu kárdex, créditos, promedio general y los parciales del periodo.', 'bi-file-earmark-bar-graph'],
]

// El alumno descarga las suyas; administración, las de un alumno (alumnoId).
export default function Constancias({ alumnoId }) {
  const [estado, setEstado] = useState({})

  async function emitir(tipo) {
    setEstado({ [tipo]: 'Generando…' })
    try {
      const nombre = await descargar('/constancias', { tipo, alumno_id: alumnoId })
      setEstado({ [tipo]: `Descargada: ${nombre}` })
    } catch (e) { setEstado({ [tipo]: 'Error: ' + e.message }) }
  }

  return (
    <>
      {!alumnoId && <Encabezado titulo="Constancias" detalle="Se generan al momento en PDF, con folio y código para verificarlas en línea." />}
      <div className="rejilla-tarjetas">
        {TIPOS.map(([tipo, titulo, detalle, icono]) => (
          <div className="tarjeta tramite" key={tipo}>
            <span className="kpi-icono morado"><i className={`bi ${icono}`} /></span>
            <h2>{titulo}</h2>
            <p className="text-muted">{detalle}</p>
            <button className="btn-primario" onClick={() => emitir(tipo)} disabled={estado[tipo] === 'Generando…'}>
              <i className="bi bi-download" /> Descargar PDF
            </button>
            {estado[tipo] && <p className={`small ${estado[tipo].startsWith('Error') ? 'error' : 'text-muted'}`} role="status">{estado[tipo]}</p>}
          </div>
        ))}
      </div>
    </>
  )
}
