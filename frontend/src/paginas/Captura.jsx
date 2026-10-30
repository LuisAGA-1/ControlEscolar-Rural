import { useState } from 'react'
import { api, useApi } from '../api.js'
import { Encabezado, Cargando, useClase } from '../componentes.jsx'
import { hoy } from '../formato.js'

export default function Captura({ catalogo }) {
  const { grupoId, materiaId, alumnos, selectores } = useClase(catalogo)
  const [parcial, setParcial] = useState(1)
  const [estado, setEstado] = useState({}) // alumno_id → 'guardando' | 'ok' | mensaje de error
  const ruta = grupoId && materiaId ? `/registros?grupo_id=${grupoId}&materia_id=${materiaId}&fecha=${hoy()}&parcial=${parcial}` : null
  const { datos, error } = useApi(ruta)
  const actual = Object.fromEntries((datos?.calificaciones ?? []).map((c) => [c.alumno_id, Number(c.calificacion)]))

  async function capturar(alumno_id, texto) {
    const calificacion = Number(texto)
    if (texto === '' || calificacion === actual[alumno_id]) return
    if (!(calificacion >= 0 && calificacion <= 10)) return setEstado((s) => ({ ...s, [alumno_id]: 'Debe estar entre 0 y 10' }))
    setEstado((s) => ({ ...s, [alumno_id]: 'guardando' }))
    try {
      await api('/registros', { calificaciones: [{ alumno_id, materia_id: materiaId, parcial, calificacion }] })
      setEstado((s) => ({ ...s, [alumno_id]: 'ok' }))
    } catch (e) { setEstado((s) => ({ ...s, [alumno_id]: e.message })) }
  }

  if (!catalogo.grupos.length) return <p className="vacio">No tienes grupos asignados este periodo.</p>
  return (
    <>
      <Encabezado titulo="Calificaciones" detalle="Se guarda al salir de cada casilla. Escala de 0 a 10; se aprueba con 6." />
      <div className="tarjeta">
        <div className="filtros">
          {selectores}
          <label>Parcial
            <select value={parcial} onChange={(e) => setParcial(Number(e.target.value))}>
              {[1, 2, 3].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        </div>
        {!datos ? <Cargando error={error} /> : (
          <table className="tabla">
            <thead><tr><th>Alumno</th><th>Calificación</th><th /></tr></thead>
            <tbody>
              {alumnos.map((a) => (
                <tr key={a.id}>
                  <td>{a.nombre}<small className="text-muted">{a.matricula}</small></td>
                  <td>
                    <input key={`${ruta}${a.id}`} className="calificacion" type="number" min="0" max="10" step="0.1"
                      aria-label={`Calificación de ${a.nombre}`} defaultValue={actual[a.id] ?? ''} onBlur={(e) => capturar(a.id, e.target.value)} />
                  </td>
                  <td className="small">
                    {estado[a.id] === 'ok' ? <span className="ok"><i className="bi bi-check2" /> Guardada</span>
                      : estado[a.id] === 'guardando' ? <span className="text-muted">Guardando…</span>
                        : estado[a.id] && <span className="error">{estado[a.id]}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
