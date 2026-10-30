import { useState } from 'react'
import { useApi } from '../api.js'
import { Encabezado, Cargando, Calificacion } from '../componentes.jsx'
import { nombreGrupo } from '../formato.js'

// Barra horizontal simple: valor sobre un máximo, en rojo si queda bajo el límite.
function Barra({ valor, max, limite, sufijo = '' }) {
  if (valor == null) return <span className="text-muted">—</span>
  const n = Number(valor)
  return (
    <span className="barra" title={`${n}${sufijo}`}>
      <span className={`relleno${n < limite ? ' bajo' : ''}`} style={{ width: `${Math.min(100, (n / max) * 100)}%` }} />
      <span className="cifra">{n}{sufijo}</span>
    </span>
  )
}

export default function Reportes({ usuario, catalogo }) {
  const [elegido, setElegido] = useState('')
  const esAdmin = usuario.rol === 'administrador'
  const grupoId = elegido || catalogo.grupos[0]?.id
  const escuela = useApi(esAdmin ? '/reportes/escuela' : null)
  const grupo = useApi(grupoId ? `/reportes/grupo/${grupoId}` : null)

  return (
    <>
      <Encabezado titulo="Reportes" detalle="Periodo en curso. Promedio de parciales; se aprueba con 6. Asistencia = presentes y retardos." />

      {esAdmin && (
        <div className="tarjeta">
          <div className="tarjeta-titulo"><h2>Por grupo</h2><span className="text-muted small">Toda la facultad</span></div>
          {!escuela.datos ? <Cargando error={escuela.error} /> : (
            <table className="tabla">
              <thead><tr><th>Grupo</th><th>Alumnos</th><th>Promedio</th><th>Asistencia</th><th>Alertas</th><th /></tr></thead>
              <tbody>
                {escuela.datos.map((g) => (
                  <tr key={g.grupo_id}>
                    <td>{g.grupo}<small className="text-muted">{g.carrera}</small></td>
                    <td>{g.alumnos}</td>
                    <td><Barra valor={g.promedio} max={10} limite={7} /></td>
                    <td><Barra valor={g.asistencia} max={100} limite={85} sufijo="%" /></td>
                    <td>{g.alertas > 0 ? <span className="etiqueta-estado rojo">{g.alertas}</span> : <span className="text-muted">0</span>}</td>
                    <td><button className="btn-enlace" onClick={() => setElegido(g.grupo_id)}>Ver materias</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="tarjeta">
        <div className="tarjeta-titulo">
          <h2>Por materia</h2>
          <label className="oculto-etiqueta">Grupo
            <select value={grupoId} onChange={(e) => setElegido(e.target.value)}>
              {catalogo.grupos.map((g) => <option key={g.id} value={g.id}>{nombreGrupo(g)}</option>)}
            </select>
          </label>
        </div>
        {!grupo.datos ? <Cargando error={grupo.error} /> : (
          <table className="tabla">
            <thead><tr><th>Materia</th><th>Promedio</th><th>Reprobados</th><th>Asistencia</th></tr></thead>
            <tbody>
              {grupo.datos.map((m) => (
                <tr key={m.materia_id}>
                  <td>{m.materia}<small className="text-muted">{m.docente}</small></td>
                  <td><Calificacion valor={m.promedio} /></td>
                  <td>{m.reprobados > 0 ? <span className="etiqueta-estado rojo">{m.reprobados}</span> : <span className="text-muted">0</span>}</td>
                  <td><Barra valor={m.asistencia} max={100} limite={85} sufijo="%" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
