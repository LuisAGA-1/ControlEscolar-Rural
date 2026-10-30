import { useState } from 'react'
import { api, useApi } from '../api.js'
import { Encabezado, Cargando, useClase } from '../componentes.jsx'
import { ESTADOS, hoy } from '../formato.js'

export default function PaseLista({ catalogo }) {
  const { grupoId, materiaId, alumnos, selectores } = useClase(catalogo)
  const [fecha, setFecha] = useState(hoy)
  const [error, setError] = useState('')
  const ruta = grupoId && materiaId ? `/registros?grupo_id=${grupoId}&materia_id=${materiaId}&fecha=${fecha}&parcial=1` : null
  const { datos, error: errorCarga, recargar } = useApi(ruta)
  const estado = Object.fromEntries((datos?.asistencias ?? []).map((a) => [a.alumno_id, a.estado]))

  async function guardar(ids, nuevo) {
    setError('')
    try {
      await api('/registros', { asistencias: ids.map((alumno_id) => ({ alumno_id, materia_id: materiaId, fecha, estado: nuevo })) })
      recargar()
    } catch (e) { setError('No se guardó: ' + e.message) }
  }

  if (!catalogo.grupos.length) return <p className="vacio">No tienes grupos asignados este periodo.</p>
  const faltantes = alumnos.filter((a) => !estado[a.id]).map((a) => a.id)
  return (
    <>
      <Encabezado titulo="Pase de lista" detalle="Cada cambio se guarda al momento." />
      <div className="tarjeta">
        <div className="filtros">
          {selectores}
          <label>Fecha <input type="date" value={fecha} max={hoy()} onChange={(e) => setFecha(e.target.value)} /></label>
          <button className="btn-secundario" disabled={!datos || !faltantes.length} onClick={() => guardar(faltantes, 'presente')}>
            <i className="bi bi-check2-all" /> Marcar {faltantes.length} sin registro como presentes
          </button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        {!datos ? <Cargando error={errorCarga} /> : (
          <table className="tabla">
            <thead><tr><th>Alumno</th><th>Asistencia</th></tr></thead>
            <tbody>
              {alumnos.map((a) => (
                <tr key={a.id}>
                  <td>{a.nombre}<small className="text-muted">{a.matricula}</small></td>
                  <td><div className="estados">
                    {ESTADOS.map(([valor, letra, texto]) => (
                      <button key={valor} title={texto} aria-label={`${texto}: ${a.nombre}`} aria-pressed={estado[a.id] === valor}
                        className={`estado ${valor}${estado[a.id] === valor ? ' sel' : ''}`} onClick={() => guardar([a.id], valor)}>{letra}</button>
                    ))}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="nota">P presente · F falta · R retardo · J justificada</p>
      </div>
    </>
  )
}
