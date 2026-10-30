// Consultas de un alumno: las usa el propio alumno y el administrador (desde Alumnos).
import { useApi } from '../api.js'
import { Encabezado, Cargando, Kpi, TablaParciales, TablaKardex } from '../componentes.jsx'
import { promedio } from '../formato.js'

export function MisCalificaciones({ alumnoId }) {
  const { datos, error } = useApi(`/calificaciones${alumnoId ? `?alumno_id=${alumnoId}` : ''}`)
  return (
    <>
      {!alumnoId && <Encabezado titulo="Mis calificaciones" detalle="Parciales del periodo en curso. Se aprueba con 6." />}
      <div className="tarjeta">
        {alumnoId && <div className="tarjeta-titulo"><h2>Calificaciones del periodo</h2></div>}
        {datos ? <TablaParciales filas={datos} /> : <Cargando error={error} />}
        {datos?.length > 0 && <p className="nota">Promedio del periodo: <strong>{promedio(datos.map((d) => d.calificacion))}</strong></p>}
      </div>
    </>
  )
}

export function Kardex({ alumnoId }) {
  const { datos, error } = useApi(`/kardex${alumnoId ? `?alumno_id=${alumnoId}` : ''}`)
  return (
    <>
      {!alumnoId && <Encabezado titulo="Kárdex" detalle="Materias cursadas con su calificación final. Cuenta la mejor entre ordinario y extraordinario." />}
      {datos && (
        <div className="rejilla-kpi">
          <Kpi icono="bi-graph-up" color="morado" texto="Promedio general" valor={datos.promedio} />
          <Kpi icono="bi-award" color="azul" texto="Créditos aprobados" valor={datos.creditos} />
          <Kpi icono="bi-check2-circle" color="verde" texto="Materias aprobadas" valor={`${datos.aprobadas} de ${datos.cursadas}`} />
          <Kpi icono="bi-x-circle" color="rojo" texto="Materias por acreditar" valor={datos.cursadas - datos.aprobadas} />
        </div>
      )}
      <div className="tarjeta">
        {alumnoId && <div className="tarjeta-titulo"><h2>Kárdex</h2></div>}
        {datos ? <TablaKardex kardex={datos} /> : <Cargando error={error} />}
      </div>
    </>
  )
}
