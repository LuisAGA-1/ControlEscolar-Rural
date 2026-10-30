import { useState } from 'react'
import { local, registrar, hoy } from './api.js'

const ESTADOS = [['presente', 'P'], ['falta', 'F'], ['retardo', 'R'], ['justificada', 'J']]
const nombreGrupo = (g) => `${g.semestre}°${g.letra} ${g.carrera} (${g.periodo})`

function useGrupo() {
  const { grupos, alumnos } = local.catalogo()
  const [elegido, setGrupoId] = useState('')
  const grupoId = elegido || grupos[0]?.id || '' // el catálogo llega después del primer render
  const selector = (
    <label>Grupo{' '}
      <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
        {grupos.map((g) => <option key={g.id} value={g.id}>{nombreGrupo(g)}</option>)}
      </select>
    </label>
  )
  return [alumnos.filter((a) => a.grupo_id === grupoId), selector, grupos.length, grupoId]
}

function useMateria(grupoId) {
  const materias = local.catalogo().materias.filter((m) => m.grupo_id === grupoId)
  const [elegida, setMateriaId] = useState('')
  const materiaId = materias.some((m) => m.id === elegida) ? elegida : materias[0]?.id || ''
  const selector = (
    <label>Materia{' '}
      <select value={materiaId} onChange={(e) => setMateriaId(e.target.value)}>
        {materias.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
      </select>
    </label>
  )
  return [materiaId, selector]
}

export function PasarLista({ onCambio }) {
  const [alumnos, selector, hayGrupos, grupoId] = useGrupo()
  const [materiaId, selectorMateria] = useMateria(grupoId)
  const [fecha, setFecha] = useState(hoy)
  const asis = local.registros().asis
  const clave = (alumno_id) => `${alumno_id}|${materiaId}|${fecha}`
  const marcar = (alumno_id, estado) =>
    registrar('asis', clave(alumno_id), { alumno_id, materia_id: materiaId, fecha, estado }).then(() => onCambio(), (e) => onCambio(e.message))
  if (!hayGrupos) return <p>No tienes grupos asignados todavía.</p>
  return (
    <section>
      <div className="filtros">
        {selector}
        {selectorMateria}
        <label>Fecha <input type="date" value={fecha} max={hoy()} onChange={(e) => setFecha(e.target.value)} /></label>
        <button onClick={() => alumnos.forEach((a) => !asis[clave(a.id)] && marcar(a.id, 'presente'))}>Marcar faltantes como presentes</button>
      </div>
      <table>
        <thead><tr><th>Alumno</th><th>Asistencia</th></tr></thead>
        <tbody>
          {alumnos.map((a) => {
            const actual = asis[clave(a.id)]?.estado
            return (
              <tr key={a.id}>
                <td>{a.nombre}</td>
                <td className="estados">
                  {ESTADOS.map(([e, letra]) => (
                    <button key={e} title={e} aria-pressed={actual === e} className={actual === e ? `sel ${e}` : ''} onClick={() => marcar(a.id, e)}>{letra}</button>
                  ))}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="nota">P presente · F falta · R retardo · J justificada. Se guarda al momento.</p>
    </section>
  )
}

export function Calificaciones({ onCambio }) {
  const [alumnos, selector, hayGrupos, grupoId] = useGrupo()
  const [materiaId, selectorMateria] = useMateria(grupoId)
  const [parcial, setParcial] = useState(1)
  const cal = local.registros().cal
  if (!hayGrupos) return <p>No tienes grupos asignados todavía.</p>
  function capturar(alumno_id, texto) {
    const calificacion = Number(texto)
    if (texto === '' || !(calificacion >= 0 && calificacion <= 10)) return // fuera de 0-10 no se guarda
    registrar('cal', `${alumno_id}|${materiaId}|${parcial}`, { alumno_id, materia_id: materiaId, parcial, calificacion })
      .then(() => onCambio(), (e) => onCambio(e.message))
  }
  return (
    <section>
      <div className="filtros">
        {selector}
        {selectorMateria}
        <label>Parcial{' '}
          <select value={parcial} onChange={(e) => setParcial(Number(e.target.value))}>
            {[1, 2, 3].map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
      </div>
      <table>
        <thead><tr><th>Alumno</th><th>Calificación (0 a 10)</th></tr></thead>
        <tbody>
          {alumnos.map((a) => (
            <tr key={a.id}>
              <td>{a.nombre}</td>
              <td>
                <input key={`${a.id}${materiaId}${parcial}`} type="number" min="0" max="10" step="0.1" aria-label={`Calificación de ${a.nombre}`}
                  defaultValue={cal[`${a.id}|${materiaId}|${parcial}`]?.calificacion ?? ''}
                  onBlur={(e) => capturar(a.id, e.target.value)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="nota">Se guarda al salir de la casilla. Una casilla en rojo está fuera de 0 a 10 y no se guarda.</p>
    </section>
  )
}

export function Horario() {
  const { horarios, grupos } = local.catalogo()
  const grupo = Object.fromEntries(grupos.map((g) => [g.id, nombreGrupo(g)]))
  if (!horarios.length) return <p>Sin horario registrado.</p>
  return (
    <table>
      <thead><tr><th>Día</th><th>Hora</th><th>Grupo</th><th>Materia</th><th>Docente</th></tr></thead>
      <tbody>
        {horarios.map((h) => (
          <tr key={h.id}><td>{h.dia}</td><td>{h.hora_inicio}–{h.hora_fin}</td><td>{grupo[h.grupo_id]}</td><td>{h.materia}</td><td>{h.docente}</td></tr>
        ))}
      </tbody>
    </table>
  )
}

export function Alertas() {
  const servidor = local.alertas()
  return (
    <section>
      {servidor.length ? (
        <ul>
          {servidor.map((a) => (
            <li key={a.id} className={`alerta ${a.nivel}`}>
              <strong>{a.alumno}</strong> ({a.grupo}): {a.detalle} · {a.enviada ? 'avisada por Telegram' : 'pendiente de aviso'}
            </li>
          ))}
        </ul>
      ) : <p>Ninguna.</p>}
    </section>
  )
}
