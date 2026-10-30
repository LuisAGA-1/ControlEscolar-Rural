// Casos de uso con puertos en memoria: prueba los permisos sin PostgreSQL ni Telegram.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearCasosDeUso } from '../src/application/casosDeUso.js';
import { ErrorPermiso } from '../src/domain/permisos.js';

const ALUMNO = '00000000-0000-4000-8000-0000000000a1';
const MATE = '00000000-0000-4000-8000-0000000000b1';
const OTRA = '00000000-0000-4000-8000-0000000000b2';
const docente = { id: 'd1', rol: 'docente' };
const alumno = { id: 'u9', rol: 'alumno', alumno_id: ALUMNO };

function crear() {
  const guardados = [];
  const consultas = [];
  const constancias = [];
  const repo = {
    buscarUsuario: async ({ matricula }) =>
      matricula === 'A260001' ? { id: 'u9', nombre: 'Ana', rol: 'alumno', activo: true, password_hash: 'ok', alumno_id: ALUMNO, matricula } : undefined,
    imparte: async (_, grupo, materia) => grupo === 'g1' && materia === MATE,
    registrosDeClase: async () => ({ asistencias: [], calificaciones: [] }),
    paresQueImparte: async (_, pares) => pares.filter((p) => p.materia_id === MATE).map((p) => `${p.alumno_id}|${p.materia_id}`),
    guardarRegistros: async (_, r) => (guardados.push(r), { calificaciones: r.calificaciones.length }),
    calificacionesDelPeriodo: async (id, filtro) => (consultas.push({ id, filtro }), []),
    kardex: async () => [{ calificacion: 8, creditos: 6 }],
    datosAlumno: async (id) => (id === ALUMNO ? { nombre: 'Ana' } : undefined),
    guardarConstancia: async (c) => constancias.push(c),
    generarAlertas: async () => 0,
    alertasPendientes: async () => [],
  };
  const casos = crearCasosDeUso({
    repo,
    notificador: { enviar: async () => true },
    tokens: { firmar: (u) => JSON.stringify(u), verificarPassword: async (p, h) => p === 'bien' && h === 'ok' },
    pdf: { constancia: async (d) => Buffer.from(d.folio) },
    azar: () => '0123456789abcdef',
  });
  return { casos, guardados, consultas, constancias };
}

const cal = (materia_id) => ({ calificaciones: [{ alumno_id: ALUMNO, materia_id, parcial: 1, calificacion: 8 }] });

test('el alumno entra con su matrícula y el token lleva su alumno_id', async () => {
  const { casos } = crear();
  const { usuario } = await casos.iniciarSesion('a260001', 'bien');
  assert.equal(usuario.alumno_id, ALUMNO);
  await assert.rejects(casos.iniciarSesion('A260001', 'mal'));
});

test('el docente solo captura en las materias que imparte', async () => {
  const { casos, guardados } = crear();
  assert.equal((await casos.guardarRegistros(docente, cal(MATE))).calificaciones, 1);
  await assert.rejects(casos.guardarRegistros(docente, cal(OTRA)), ErrorPermiso);
  assert.equal(guardados.length, 1);
});

test('el alumno no captura y solo consulta lo suyo', async () => {
  const { casos, consultas } = crear();
  await assert.rejects(casos.guardarRegistros(alumno, cal(MATE)), ErrorPermiso);
  await casos.calificaciones(alumno, 'otro-alumno');
  assert.equal(consultas[0].id, ALUMNO);
  assert.equal((await casos.kardex(alumno)).creditos, 6);
});

test('el docente ve solo sus materias y no ve el kárdex', async () => {
  const { casos, consultas } = crear();
  await casos.calificaciones(docente, ALUMNO);
  assert.deepEqual(consultas[0], { id: ALUMNO, filtro: { docenteId: 'd1' } });
  await assert.rejects(casos.kardex(docente, ALUMNO), ErrorPermiso);
});

test('el docente solo abre la lista de las clases que imparte', async () => {
  const { casos } = crear();
  const G1 = '00000000-0000-4000-8000-0000000000c1';
  const clase = (grupo_id, materia_id) => ({ grupo_id, materia_id, fecha: '2026-10-12', parcial: '1' });
  await assert.rejects(casos.registrosDeClase(docente, clase(G1, OTRA)), ErrorPermiso);
  await assert.rejects(casos.registrosDeClase(alumno, clase(G1, MATE)), ErrorPermiso);
  await assert.rejects(casos.registrosDeClase(docente, { grupo_id: G1 }), /materia_id/);
});

test('el alumno emite su propia constancia aunque pida la de otro; el docente no emite', async () => {
  const { casos, constancias } = crear();
  const c = await casos.emitirConstancia(alumno, { tipo: 'estudios', alumno_id: 'otro' });
  assert.equal(c.archivo.toString(), c.folio);
  assert.deepEqual(constancias[0], { folio: c.folio, codigo: '89ABCDEF', alumno_id: ALUMNO, tipo: 'estudios', emitida_por: 'u9' });
  await assert.rejects(casos.emitirConstancia(docente, { tipo: 'estudios', alumno_id: ALUMNO }), ErrorPermiso);
  await assert.rejects(casos.emitirConstancia(alumno, { tipo: 'titulo' }), /tipo de constancia/);
});
