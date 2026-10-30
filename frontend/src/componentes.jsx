// Piezas que comparten varias páginas.
import { useState } from 'react'
import { nombreGrupo, ESTADOS } from './formato.js'

export function Encabezado({ titulo, detalle, children }) {
  return (
    <div className="encabezado">
      <div>
        <h1>{titulo}</h1>
        {detalle && <p className="text-muted">{detalle}</p>}
      </div>
      {children}
    </div>
  )
}

export function Kpi({ icono, color, texto, valor, href }) {
  const Etiqueta = href ? 'a' : 'div'
  return (
    <Etiqueta className={`kpi aparece${href ? ' enlace' : ''}`} href={href}>
      <span className={`kpi-icono ${color}`}><i className={`bi ${icono}`} /></span>
      <div><small>{texto}</small><strong>{valor ?? '—'}</strong></div>
    </Etiqueta>
  )
}

export function Cargando({ error }) {
  return <p className={error ? 'error' : 'vacio'}>{error || 'Cargando…'}</p>
}

// Grupo y materia que el usuario puede capturar, según el catálogo de su rol.
export function useClase(catalogo) {
  const [grupoElegido, setGrupo] = useState('')
  const [materiaElegida, setMateria] = useState('')
  const grupoId = grupoElegido || catalogo.grupos[0]?.id || ''
  const materias = catalogo.materias.filter((m) => m.grupo_id === grupoId)
  const materiaId = materias.some((m) => m.id === materiaElegida) ? materiaElegida : materias[0]?.id || ''
  const selectores = (
    <>
      <label>Grupo
        <select value={grupoId} onChange={(e) => setGrupo(e.target.value)}>
          {catalogo.grupos.map((g) => <option key={g.id} value={g.id}>{nombreGrupo(g)}</option>)}
        </select>
      </label>
      <label>Materia
        <select value={materiaId} onChange={(e) => setMateria(e.target.value)}>
          {materias.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
      </label>
    </>
  )
  return { grupoId, materiaId, alumnos: catalogo.alumnos.filter((a) => a.grupo_id === grupoId), selectores }
}

export function EtiquetaEstado({ estado }) {
  const color = { presente: 'verde', falta: 'rojo', retardo: 'ambar', justificada: 'azul' }[estado] ?? 'gris'
  return <span className={`etiqueta-estado ${color}`}>{ESTADOS.find((e) => e[0] === estado)?.[2] ?? 'Sin registro'}</span>
}

export function Calificacion({ valor }) {
  if (valor == null) return <span className="text-muted">—</span>
  return <strong className={Number(valor) < 6 ? 'reprobada' : ''}>{Number(valor).toFixed(1)}</strong>
}

// Parciales del periodo agrupados por materia (filas) y parcial (columnas).
export function TablaParciales({ filas }) {
  const materias = [...new Map(filas.map((f) => [f.materia_id, f.materia])).entries()]
  if (!materias.length) return <p className="vacio">Todavía no hay calificaciones capturadas este periodo.</p>
  const valor = (m, p) => filas.find((f) => f.materia_id === m && f.parcial === p)?.calificacion
  return (
    <table className="tabla">
      <thead><tr><th>Materia</th><th>1er parcial</th><th>2º parcial</th><th>3er parcial</th></tr></thead>
      <tbody>
        {materias.map(([id, nombre]) => (
          <tr key={id}><td>{nombre}</td>{[1, 2, 3].map((p) => <td key={p}><Calificacion valor={valor(id, p)} /></td>)}</tr>
        ))}
      </tbody>
    </table>
  )
}

export function TablaKardex({ kardex }) {
  if (!kardex.materias.length) return <p className="vacio">Aún no hay materias en el kárdex (primer semestre).</p>
  return (
    <table className="tabla">
      <thead><tr><th>Sem.</th><th>Clave</th><th>Materia</th><th>Créditos</th><th>Periodo</th><th>Calificación</th></tr></thead>
      <tbody>
        {kardex.materias.map((m) => (
          <tr key={m.clave}>
            <td>{m.semestre}°</td><td className="text-muted">{m.clave}</td><td>{m.materia}</td><td>{m.creditos}</td>
            <td>{m.periodo}{m.tipo === 'extraordinario' && <span className="etiqueta-estado ambar">Extra</span>}</td>
            <td><Calificacion valor={m.calificacion} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
