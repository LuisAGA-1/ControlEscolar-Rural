import { useState } from 'react'
import { api } from '../api.js'

// Página pública: comprueba con folio y código que una constancia la emitió la facultad.
export default function Verificar() {
  const [folio, setFolio] = useState('')
  const [codigo, setCodigo] = useState('')
  const [resultado, setResultado] = useState(null)

  async function verificar(e) {
    e.preventDefault()
    try {
      setResultado(await api(`/constancias/verificar?folio=${encodeURIComponent(folio)}&codigo=${encodeURIComponent(codigo)}`))
    } catch (err) { setResultado({ error: err.message }) }
  }

  return (
    <div className="verificar">
      <form className="tarjeta" onSubmit={verificar}>
        <a className="marca" href="#inicio">
          <span className="escudo"><i className="bi bi-mortarboard-fill" /></span>
          <span><strong>Control Escolar</strong><small>Facultad de Contaduría y Administración</small></span>
        </a>
        <h1>Verificar constancia</h1>
        <p className="text-muted">Escribe el folio y el código que vienen al pie de la constancia.</p>
        <div className="filtros">
          <label>Folio <input value={folio} onChange={(e) => setFolio(e.target.value)} placeholder="FCA-2026-A1B2C3D4" required /></label>
          <label>Código <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="E5F6A7B8" required /></label>
          <button className="btn-primario">Verificar</button>
        </div>
        {resultado?.valida === true && (
          <div className="resultado valida" role="status">
            <i className="bi bi-patch-check-fill" />
            <div>
              <strong>Constancia auténtica</strong>
              <p>{resultado.tipo} de {resultado.alumno} ({resultado.matricula}), {resultado.carrera}.</p>
              <p className="small">Emitida el {new Date(resultado.emitida).toLocaleString('es-MX')} · Folio {resultado.folio}</p>
            </div>
          </div>
        )}
        {resultado?.valida === false && (
          <div className="resultado invalida" role="status">
            <i className="bi bi-x-octagon-fill" />
            <div><strong>No encontramos esa constancia</strong><p>Revisa el folio y el código. Si son correctos, el documento no es válido.</p></div>
          </div>
        )}
        {resultado?.error && <p className="error">{resultado.error}</p>}
      </form>
    </div>
  )
}
