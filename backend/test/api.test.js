// Prueba de punta a punta contra una base con 001_schema.sql y 002_datos_prueba.sql cargados.
// Uso: DB_HOST=localhost DB_NAME=control_escolar DB_PASSWORD=... npm test  (sin DB_PASSWORD se omite)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { crearPool, crearRepositorioPg } from '../src/infrastructure/persistence/repositorioPg.js';
import { crearCasosDeUso } from '../src/application/casosDeUso.js';
import { crearApp } from '../src/infrastructure/http/app.js';
import { crearGeneradorPdf } from '../src/infrastructure/pdf/constanciaPdf.js';
import { randomBytes } from 'node:crypto';

test('roles contra PostgreSQL', { skip: !process.env.DB_PASSWORD && 'sin DB_PASSWORD' }, async (t) => {
  const pool = crearPool();
  const casos = crearCasosDeUso({
    repo: crearRepositorioPg(pool),
    notificador: { enviar: async () => true },
    tokens: { firmar: (u) => jwt.sign(u, 'x'), verificarPassword: (p, h) => bcrypt.compare(p, h) },
    pdf: crearGeneradorPdf(),
    azar: () => randomBytes(8).toString('hex'),
  });
  const srv = crearApp({ casos, secreto: 'x', ping: async () => ({ ok: true }) }).listen(0);
  t.after(() => (srv.close(), pool.end()));
  const url = `http://localhost:${srv.address().port}/api`;
  const api = async (ruta, cuerpo, token) => {
    const r = await fetch(url + ruta, {
      method: cuerpo ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: cuerpo && JSON.stringify(cuerpo),
    });
    return { status: r.status, body: await r.json() };
  };
  const entrar = async (usuario, password) => (await api('/auth/login', { usuario, password })).body;

  // Un alumno de un grupo de María y una materia que ella imparte ahí; otra materia que no imparte.
  const { rows: [caso] } = await pool.query(`
    SELECT a.id AS alumno_id, a.matricula, h.materia_id,
           (SELECT h2.materia_id FROM horarios h2 WHERE h2.grupo_id = a.grupo_id AND h2.docente_id <> u.id LIMIT 1) AS ajena
      FROM usuarios u JOIN horarios h ON h.docente_id = u.id JOIN alumnos a ON a.grupo_id = h.grupo_id
     WHERE u.email = 'maria.docente@escuela.mx' ORDER BY a.matricula LIMIT 1`);

  assert.equal((await api('/auth/login', { usuario: 'maria.docente@escuela.mx', password: 'mal' })).status, 400);
  const maria = await entrar('maria.docente@escuela.mx', 'docente123');
  const admin = await entrar('admin@escuela.mx', 'docente123');
  const alumno = await entrar(caso.matricula.toLowerCase(), 'alumno123');
  assert.deepEqual([maria.usuario.rol, admin.usuario.rol, alumno.usuario.rol], ['docente', 'administrador', 'alumno']);
  assert.equal(alumno.usuario.alumno_id, caso.alumno_id);

  const cat = (await api('/catalogo', null, maria.token)).body;
  assert.ok(cat.grupos.length >= 1 && cat.horarios.every((h) => h.docente === maria.usuario.nombre));
  assert.equal((await api('/catalogo', null, alumno.token)).body.alumnos.length, 1, 'el alumno no ve a sus compañeros');
  assert.equal((await api('/catalogo', null, admin.token)).body.grupos.length, 16);

  const registro = (materia_id) => ({
    asistencias: [{ alumno_id: caso.alumno_id, materia_id, fecha: '2026-10-12', estado: 'falta' }],
    calificaciones: [{ alumno_id: caso.alumno_id, materia_id, parcial: 3, calificacion: 7.5 }],
  });
  assert.equal((await api('/registros', registro(caso.materia_id), maria.token)).status, 200);
  assert.equal((await api('/registros', registro(caso.ajena), maria.token)).status, 403);
  assert.equal((await api('/registros', registro(caso.materia_id), alumno.token)).status, 403);
  assert.equal((await api('/registros', { asistencias: [{ ...registro(caso.materia_id).asistencias[0], fecha: 'ayer' }] }, maria.token)).status, 400);

  const { rows: [g] } = await pool.query('SELECT grupo_id FROM alumnos WHERE id = $1', [caso.alumno_id]);
  const clase = (materia_id) => `/registros?grupo_id=${g.grupo_id}&materia_id=${materia_id}&fecha=2026-10-12&parcial=3`;
  const guardado = (await api(clase(caso.materia_id), null, maria.token)).body;
  assert.ok(guardado.asistencias.some((a) => a.alumno_id === caso.alumno_id && a.estado === 'falta'));
  assert.ok(guardado.calificaciones.some((c) => c.alumno_id === caso.alumno_id && Number(c.calificacion) === 7.5));
  assert.equal((await api(clase(caso.ajena), null, maria.token)).status, 403);

  const propias = (await api(`/calificaciones?alumno_id=00000000-0000-4000-8000-000000000000`, null, alumno.token)).body;
  assert.ok(propias.some((c) => c.parcial === 3 && Number(c.calificacion) === 7.5), 'el alumno ve sus calificaciones, no las del id pedido');
  const deMaria = (await api(`/calificaciones?alumno_id=${caso.alumno_id}`, null, maria.token)).body;
  assert.ok(deMaria.length > 0 && deMaria.every((c) => c.materia_id === caso.materia_id));

  const kardex = (await api('/kardex', null, alumno.token)).body;
  assert.equal(kardex.cursadas, kardex.materias.length);
  assert.equal((await api(`/kardex?alumno_id=${caso.alumno_id}`, null, maria.token)).status, 403);
  assert.equal((await api(`/kardex?alumno_id=${caso.alumno_id}`, null, admin.token)).body.cursadas, kardex.cursadas);

  // Constancia en PDF y su verificación pública
  const r = await fetch(url + '/constancias', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alumno.token}` },
    body: JSON.stringify({ tipo: 'calificaciones' }),
  });
  assert.equal(r.headers.get('content-type'), 'application/pdf');
  assert.equal((await r.arrayBuffer()).byteLength > 1000, true);
  const { rows: [k] } = await pool.query('SELECT folio, codigo_verificacion FROM constancias WHERE alumno_id = $1 ORDER BY created_at DESC LIMIT 1', [caso.alumno_id]);
  assert.equal((await api(`/constancias/verificar?folio=${k.folio}&codigo=${k.codigo_verificacion}`)).body.matricula, caso.matricula);
  assert.equal((await api(`/constancias/verificar?folio=${k.folio}&codigo=MAL`)).body.valida, false);
  assert.equal((await api('/constancias', { tipo: 'estudios', alumno_id: caso.alumno_id }, maria.token)).status, 403);

  // Reportes
  const escuela = (await api('/reportes/escuela', null, admin.token)).body;
  assert.equal(escuela.length, 16);
  assert.equal((await api('/reportes/escuela', null, maria.token)).status, 403);
  const reporte = (await api(`/reportes/grupo/${g.grupo_id}`, null, maria.token)).body;
  assert.equal(reporte.length, 4);
  const ajeno = escuela.find((x) => !cat.grupos.some((cg) => cg.id === x.grupo_id)).grupo_id;
  assert.equal((await api(`/reportes/grupo/${ajeno}`, null, maria.token)).status, 403);

  assert.equal((await api('/alertas', null, alumno.token)).status, 403);
  assert.ok(Array.isArray((await api('/alertas', null, admin.token)).body));
  assert.equal((await api('/alertas', null, 'token-falso')).status, 401);
});
