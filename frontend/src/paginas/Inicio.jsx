import { useApi } from '../api.js'
import { Kpi } from '../componentes.jsx'
import { diaDeHoy, fechaLarga, saludo, nombreGrupo, TIPO_ALERTA, promedio } from '../formato.js'

export default function Inicio({ usuario, catalogo, alertas }) {
  const esAlumno = usuario.rol === 'alumno'
  const clasesHoy = catalogo.horarios.filter((h) => h.dia === diaDeHoy())
  const grupo = Object.fromEntries(catalogo.grupos.map((g) => [g.id, nombreGrupo(g)]))
  const subtitulo = { administrador: 'Este es el resumen de toda la facultad.', docente: 'Este es el resumen de tus grupos.', alumno: `Matrícula ${usuario.matricula} · ${catalogo.grupos[0]?.carrera_nombre ?? ''}` }

  return (
    <>
      <section className="bienvenida aparece">
        <div>
          <p className="text-muted">{fechaLarga()}</p>
          <h1>{saludo()}, {usuario.nombre.split(' ')[0]}</h1>
          <p className="text-muted">{subtitulo[usuario.rol]}</p>
        </div>
        {esAlumno
          ? <a className="btn-primario" href="#calificaciones"><i className="bi bi-journal-text" /> Ver mis calificaciones</a>
          : <a className="btn-primario" href="#lista"><i className="bi bi-calendar-check" /> Pasar lista</a>}
      </section>

      {esAlumno ? <KpisAlumno clasesHoy={clasesHoy.length} materias={catalogo.materias.length} /> : (
        <div className="rejilla-kpi">
          <Kpi icono="bi-people" color="azul" texto={usuario.rol === 'docente' ? 'Mis alumnos' : 'Alumnos inscritos'} valor={catalogo.alumnos.length} />
          <Kpi icono="bi-collection" color="morado" texto={usuario.rol === 'docente' ? 'Mis grupos' : 'Grupos del periodo'} valor={catalogo.grupos.length} />
          <Kpi icono="bi-clock" color="verde" texto="Clases de hoy" valor={clasesHoy.length} />
          <Kpi icono="bi-exclamation-triangle" color="rojo" texto="Alertas abiertas" valor={alertas.length} href="#alertas" />
        </div>
      )}

      <div className="rejilla-2">
        <div className="tarjeta">
          <div className="tarjeta-titulo"><h2>Clases de hoy</h2><a href="#horario" className="small">Horario completo</a></div>
          {clasesHoy.length === 0 && <p className="vacio">No hay clases hoy.</p>}
          {clasesHoy.slice(0, 8).map((c) => (
            <div className="clase" key={c.id}>
              <span className="hora">{c.hora_inicio}<small>{c.hora_fin}</small></span>
              <div><strong>{c.materia}</strong><small>{grupo[c.grupo_id]} · {c.docente}</small></div>
            </div>
          ))}
        </div>

        {esAlumno ? (
          <div className="tarjeta">
            <div className="tarjeta-titulo"><h2>Trámites</h2></div>
            <a className="clase enlace" href="#kardex"><i className="bi bi-card-list" /><div><strong>Kárdex</strong><small>Materias cursadas, créditos y promedio</small></div></a>
            <div className="clase"><i className="bi bi-file-earmark-text" /><div><strong>Constancias</strong><small>Próximamente: de estudios y de calificaciones en PDF</small></div></div>
          </div>
        ) : (
          <div className="tarjeta">
            <div className="tarjeta-titulo"><h2>Alertas de rezago</h2><a href="#alertas" className="small">Ver todas</a></div>
            {alertas.length === 0 && <p className="vacio"><i className="bi bi-emoji-smile" /> Sin alertas abiertas.</p>}
            <ul className="lista-alertas">
              {alertas.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <span className={`punto ${a.nivel}`} />
                  <div><strong>{a.alumno}</strong> <span className="text-muted">· {a.grupo}</span><small>{TIPO_ALERTA[a.tipo]}: {a.detalle}</small></div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {!esAlumno && (
        <div className="tarjeta">
          <div className="tarjeta-titulo"><h2>{usuario.rol === 'docente' ? 'Mis grupos' : 'Grupos del periodo'}</h2></div>
          <div className="grupos">
            {catalogo.grupos.map((g) => (
              <div className="grupo" key={g.id}>
                <span className="grupo-grado">{g.semestre}°{g.letra}</span>
                <span><strong>{g.carrera_nombre}</strong><small>{catalogo.alumnos.filter((a) => a.grupo_id === g.id).length} alumnos · {g.periodo}</small></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function KpisAlumno({ clasesHoy, materias }) {
  const { datos: parciales } = useApi('/calificaciones')
  const { datos: kardex } = useApi('/kardex')
  return (
    <div className="rejilla-kpi">
      <Kpi icono="bi-graph-up" color="morado" texto="Promedio del periodo" valor={parciales && promedio(parciales.map((p) => p.calificacion))} href="#calificaciones" />
      <Kpi icono="bi-award" color="azul" texto="Créditos aprobados" valor={kardex?.creditos} href="#kardex" />
      <Kpi icono="bi-book" color="verde" texto="Materias que cursas" valor={materias} />
      <Kpi icono="bi-clock" color="rojo" texto="Clases de hoy" valor={clasesHoy} href="#horario" />
    </div>
  )
}
