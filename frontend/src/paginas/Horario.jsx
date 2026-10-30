import { useState } from 'react'
import { Encabezado } from '../componentes.jsx'
import { DIAS_CLASE, diaDeHoy, nombreDia, nombreGrupo } from '../formato.js'

export default function Horario({ usuario, catalogo }) {
  // El administrador ve un grupo a la vez; docente y alumno, todas sus clases.
  const [elegido, setElegido] = useState('')
  const porGrupo = usuario.rol === 'administrador'
  const grupoId = elegido || catalogo.grupos[0]?.id
  const clases = porGrupo ? catalogo.horarios.filter((h) => h.grupo_id === grupoId) : catalogo.horarios
  const grupo = Object.fromEntries(catalogo.grupos.map((g) => [g.id, nombreGrupo(g)]))
  const hoy = diaDeHoy()

  return (
    <>
      <Encabezado titulo="Horario semanal" detalle={`${clases.length} clases a la semana.`}>
        {porGrupo && (
          <label className="oculto-etiqueta">Grupo
            <select value={grupoId} onChange={(e) => setElegido(e.target.value)}>
              {catalogo.grupos.map((g) => <option key={g.id} value={g.id}>{nombreGrupo(g)}</option>)}
            </select>
          </label>
        )}
      </Encabezado>
      <div className="semana">
        {DIAS_CLASE.map((dia) => {
          const delDia = clases.filter((c) => c.dia === dia)
          return (
            <div key={dia} className={`dia${dia === hoy ? ' hoy' : ''}`}>
              <h2>{nombreDia(dia)} {dia === hoy && <span className="insignia">Hoy</span>}</h2>
              {delDia.length === 0 && <p className="vacio small">Sin clases</p>}
              {delDia.map((c) => (
                <div className="bloque" key={c.id}>
                  <small>{c.hora_inicio} – {c.hora_fin}</small>
                  <strong>{c.materia}</strong>
                  <small>{grupo[c.grupo_id]} · {c.docente}</small>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </>
  )
}
