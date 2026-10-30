import { useEffect, useState } from 'react'
import { sesion, useApi } from './api.js'
import { iniciales, ROL } from './formato.js'
import { Cargando } from './componentes.jsx'
import Login from './paginas/Login.jsx'
import Inicio from './paginas/Inicio.jsx'
import PaseLista from './paginas/PaseLista.jsx'
import Captura from './paginas/Captura.jsx'
import Horario from './paginas/Horario.jsx'
import Alertas from './paginas/Alertas.jsx'
import Alumnos from './paginas/Alumnos.jsx'
import { MisCalificaciones, Kardex } from './paginas/Alumno.jsx'
import Constancias from './paginas/Constancias.jsx'
import Reportes from './paginas/Reportes.jsx'
import Verificar from './paginas/Verificar.jsx'

// Página → [texto del menú, ícono, componente]
const PAGINAS = {
  inicio: ['Inicio', 'bi-grid-1x2', Inicio],
  alumnos: ['Alumnos', 'bi-people', Alumnos],
  lista: ['Pase de lista', 'bi-calendar-check', PaseLista],
  captura: ['Calificaciones', 'bi-journal-text', Captura],
  calificaciones: ['Mis calificaciones', 'bi-journal-text', MisCalificaciones],
  kardex: ['Kárdex', 'bi-card-list', Kardex],
  constancias: ['Constancias', 'bi-file-earmark-text', Constancias],
  reportes: ['Reportes', 'bi-bar-chart', Reportes],
  horario: ['Horario', 'bi-clock', Horario],
  alertas: ['Alertas de rezago', 'bi-exclamation-triangle', Alertas],
}
const MENU = {
  administrador: ['inicio', 'alumnos', 'reportes', 'lista', 'captura', 'horario', 'alertas'],
  docente: ['inicio', 'lista', 'captura', 'reportes', 'horario', 'alertas'],
  alumno: ['inicio', 'calificaciones', 'kardex', 'constancias', 'horario'],
}

const paginaDeLaUrl = () => location.hash.slice(1)

export default function App() {
  const [actual, setActual] = useState(sesion.leer)
  const [hash, setHash] = useState(paginaDeLaUrl)
  const [menuAbierto, setMenuAbierto] = useState(false)

  function salir() { sesion.borrar(); setActual(null) }

  useEffect(() => {
    const cambio = () => { setHash(paginaDeLaUrl()); setMenuAbierto(false) }
    addEventListener('hashchange', cambio)
    addEventListener('sesion-vencida', salir)
    return () => { removeEventListener('hashchange', cambio); removeEventListener('sesion-vencida', salir) }
  }, [])

  if (hash === 'verificar') return <Verificar /> // pública, con o sin sesión
  if (!actual) return <Login onEntrar={() => setActual(sesion.leer())} />
  return <Portal usuario={actual.usuario} hash={hash} menuAbierto={menuAbierto} setMenuAbierto={setMenuAbierto} salir={salir} />
}

function Portal({ usuario, hash, menuAbierto, setMenuAbierto, salir }) {
  const menu = MENU[usuario.rol] ?? []
  const pagina = menu.includes(hash) ? hash : 'inicio'
  const [titulo, , Pagina] = PAGINAS[pagina]
  const { datos: catalogo, error } = useApi('/catalogo')
  const { datos: alertas } = useApi(usuario.rol === 'alumno' ? null : '/alertas')

  return (
    <div className="app">
      <aside className={`sidebar${menuAbierto ? ' abierto' : ''}`}>
        <a className="marca" href="#inicio">
          <span className="escudo"><i className="bi bi-mortarboard-fill" /></span>
          <span><strong>Control Escolar</strong><small>Facultad de Contaduría y Administración</small></span>
        </a>
        <nav>
          <span className="seccion">Menú principal</span>
          {menu.map((p) => (
            <a key={p} href={`#${p}`} className={p === pagina ? 'activo' : ''} aria-current={p === pagina ? 'page' : undefined}>
              <i className={`bi ${PAGINAS[p][1]}`} /> {PAGINAS[p][0]}
            </a>
          ))}
        </nav>
        <div className="pie-sidebar">Periodo {catalogo?.grupos[0]?.periodo ?? ''}</div>
      </aside>
      {menuAbierto && <div className="velo" onClick={() => setMenuAbierto(false)} />}

      <div className="contenido">
        <header className="topbar">
          <button className="boton-icono menu-btn" aria-label="Abrir menú" onClick={() => setMenuAbierto(!menuAbierto)}><i className="bi bi-list" /></button>
          <div className="migas"><span className="text-muted">Control Escolar</span> <i className="bi bi-chevron-right" /> <strong>{titulo}</strong></div>
          <div className="usuario">
            <span className="avatar">{iniciales(usuario.nombre)}</span>
            <span className="solo-ancho"><strong>{usuario.nombre}</strong><small>{ROL[usuario.rol]}</small></span>
            <button className="boton-icono" onClick={salir} aria-label="Cerrar sesión" title="Cerrar sesión"><i className="bi bi-box-arrow-right" /></button>
          </div>
        </header>
        <main className="pagina">
          {catalogo ? <Pagina usuario={usuario} catalogo={catalogo} alertas={alertas ?? []} /> : <Cargando error={error} />}
        </main>
      </div>
    </div>
  )
}
