import { useState } from 'react'
import { local, registrar, hoy, alertasLocales } from './sync.js'

const ESTADOS = [['presente', 'P'], ['falta', 'F'], ['retardo', 'R'], ['justificada', 'J']]
const nombreGrupo = (g) => `${g.grado}°${g.letra} (${g.ciclo})`

function useGrupo() {
  const { grupos, alumnos } = local.catalogo()
  const [grupoId, setGrupoId] = useState(grupos[0]?.id ?? '')
  const selector = (
    <label>Grupo{' '}
      <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
        {grupos.map((g) => <option key={g.id} value={g.id}>{nombreGrupo(g)}</option>)}
      </select>
    </label>
  )
  return [alumnos.filter((a) => a.grupo_id === grupoId), selector, grupos.length]
}

export function PasarLista({ onCambio }) {
  const [alumnos, selector, hayGrupos] = useGrupo()
  const [fecha, setFecha] = useState(hoy)
  const asis = local.registros().asis
  const marcar = (alumno_id, estado) => { registrar('asis', `${alumno_id}|${fecha}`, { alumno_id, fecha, estado }); onCambio() }
  if (!hayGrupos) return <p>No tienes grupos asignados todavía.</p>
  return (
    <section>
      <div className="filtros">
        {selector}
        <label>Fecha <input type="date" value={fecha} max={hoy()} onChange={(e) => setFecha(e.target.value)} /></label>
        <button onClick={() => alumnos.forEach((a) => !asis[`${a.id}|${fecha}`] && marcar(a.id, 'presente'))}>Marcar faltantes como presentes</button>
      </div>
      <table>
        <thead><tr><th>Alumno</th><th>Asistencia</th></tr></thead>
        <tbody>
          {alumnos.map((a) => {
            const actual = asis[`${a.id}|${fecha}`]?.estado
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
      <p className="nota">P presente · F falta · R retardo · J justificada. Se guarda en el dispositivo y se sube al haber conexión.</p>
    </section>
  )
}

export function Calificaciones({ onCambio }) {
  const [alumnos, selector, hayGrupos] = useGrupo()
  const { materias } = local.catalogo()
  const [materiaId, setMateriaId] = useState(materias[0]?.id ?? '')
  const [parcial, setParcial] = useState(1)
  const cal = local.registros().cal
  if (!hayGrupos) return <p>No tienes grupos asignados todavía.</p>
  function capturar(alumno_id, texto) {
    const calificacion = Number(texto)
    if (texto === '' || !(calificacion >= 0 && calificacion <= 10)) return // fuera de 0-10 no se guarda
    registrar('cal', `${alumno_id}|${materiaId}|${parcial}`, { alumno_id, materia_id: materiaId, parcial, calificacion })
    onCambio()
  }
  return (
    <section>
      <div className="filtros">
        {selector}
        <label>Materia{' '}
          <select value={materiaId} onChange={(e) => setMateriaId(e.target.value)}>
            {materias.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </label>
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
  const enDispositivo = alertasLocales(local.catalogo().alumnos)
  return (
    <section>
      <h3>Detectadas en este dispositivo (sin internet)</h3>
      {enDispositivo.length ? <ul>{enDispositivo.map((a) => <li key={a.alumno} className="alerta amarilla">{a.alumno}: {a.detalle}</li>)}</ul> : <p>Ninguna.</p>}
      <h3>Alertas del servidor</h3>
      {servidor.length ? (
        <ul>
          {servidor.map((a) => (
            <li key={a.id} className={`alerta ${a.nivel}`}>
              <strong>{a.alumno}</strong> ({a.grupo}): {a.detalle} · {a.enviada ? 'avisada por Telegram' : 'pendiente de aviso'}
            </li>
          ))}
        </ul>
      ) : <p>Ninguna (se actualizan al sincronizar).</p>}
    </section>
  )
}
