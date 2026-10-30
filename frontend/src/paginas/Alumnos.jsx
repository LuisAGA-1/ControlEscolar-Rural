import { useState } from 'react'
import { Encabezado } from '../componentes.jsx'
import { nombreGrupo } from '../formato.js'
import { MisCalificaciones, Kardex } from './Alumno.jsx'

// Administración: busca un alumno y consulta su situación académica.
export default function Alumnos({ catalogo }) {
  const [busqueda, setBusqueda] = useState('')
  const [elegido, setElegido] = useState(null)
  const grupo = Object.fromEntries(catalogo.grupos.map((g) => [g.id, nombreGrupo(g)]))
  const texto = busqueda.trim().toLowerCase()
  const encontrados = catalogo.alumnos.filter((a) => !texto || a.nombre.toLowerCase().includes(texto) || a.matricula.toLowerCase().includes(texto))

  if (elegido) {
    return (
      <>
        <Encabezado titulo={elegido.nombre} detalle={`${elegido.matricula} · ${grupo[elegido.grupo_id]}`}>
          <button className="btn-secundario" onClick={() => setElegido(null)}><i className="bi bi-arrow-left" /> Volver a la lista</button>
        </Encabezado>
        <MisCalificaciones alumnoId={elegido.id} />
        <Kardex alumnoId={elegido.id} />
      </>
    )
  }
  return (
    <>
      <Encabezado titulo="Alumnos" detalle={`${catalogo.alumnos.length} alumnos inscritos en el periodo.`}>
        <label className="oculto-etiqueta">Buscar
          <input type="search" placeholder="Nombre o matrícula" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </label>
      </Encabezado>
      <div className="tarjeta">
        <table className="tabla">
          <thead><tr><th>Alumno</th><th>Matrícula</th><th>Grupo</th><th /></tr></thead>
          <tbody>
            {encontrados.slice(0, 50).map((a) => (
              <tr key={a.id}>
                <td>{a.nombre}</td><td className="text-muted">{a.matricula}</td><td>{grupo[a.grupo_id]}</td>
                <td><button className="btn-enlace" onClick={() => setElegido(a)}>Ver calificaciones y kárdex</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {encontrados.length > 50 && <p className="nota">Se muestran 50 de {encontrados.length}. Escribe para buscar.</p>}
        {encontrados.length === 0 && <p className="vacio">Ningún alumno coincide.</p>}
      </div>
    </>
  )
}
