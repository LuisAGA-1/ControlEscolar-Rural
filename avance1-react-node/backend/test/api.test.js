// Prueba de punta a punta contra una base con 001_schema.sql y 002_avance1.sql cargados.
// Uso: DB_HOST=localhost DB_NAME=control_escolar DB_PASSWORD=... npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { crearPool, crearRepositorioPg } from '../src/infrastructure/persistence/repositorioPg.js';
import { crearCasosDeUso } from '../src/application/casosDeUso.js';
import { crearApp } from '../src/infrastructure/http/app.js';
import { validarCalificacion } from '../src/domain/registros.js';

const ANA = '55555555-5555-5555-5555-555555555551';
const LUCIA = '55555555-5555-5555-5555-555555555553';
const ESPANOL = '44444444-4444-4444-4444-444444444441';

test('dominio rechaza calificación fuera de 0-10', () => {
  assert.throws(() => validarCalificacion({ alumno_id: ANA, materia_id: ESPANOL, parcial: 1, calificacion: 11 }));
});

test('login, catálogo, sincronización idempotente y alertas', async (t) => {
  const pool = crearPool();
  const enviados = [];
  const casos = crearCasosDeUso({
    repo: crearRepositorioPg(pool),
    notificador: { enviar: async (chat, texto) => (enviados.push({ chat, texto }), true) },
    tokens: { firmar: (u) => jwt.sign(u, 'x'), verificarPassword: (p, h) => bcrypt.compare(p, h) },
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

  assert.equal((await api('/auth/login', { email: 'maria.docente@escuela.mx', password: 'mal' })).status, 400);
  const { body: sesion } = await api('/auth/login', { email: 'maria.docente@escuela.mx', password: 'docente123' });
  assert.equal(sesion.usuario.rol, 'docente');

  const { body: cat } = await api('/catalogo', null, sesion.token);
  assert.equal(cat.grupos.length, 1);
  assert.equal(cat.alumnos.length, 3);
  assert.equal(cat.horarios.length, 2);

  const lote = {
    id: randomUUID(),
    dispositivo_id: 'prueba',
    asistencias: [{ alumno_id: ANA, fecha: '2026-10-12', estado: 'falta' }],
    calificaciones: [{ alumno_id: LUCIA, materia_id: ESPANOL, parcial: 2, calificacion: 4 }],
  };
  const r1 = await api('/sync/lote', lote, sesion.token);
  assert.equal(r1.status, 200);
  assert.equal(r1.body.duplicado, false);
  const r2 = await api('/sync/lote', lote, sesion.token); // reintento del mismo lote
  assert.equal(r2.body.duplicado, true);

  const { rows } = await pool.query('SELECT estado FROM asistencias WHERE alumno_id = $1 AND fecha = $2', [ANA, '2026-10-12']);
  assert.deepEqual(rows, [{ estado: 'falta' }]);

  assert.equal((await api('/sync/lote', { ...lote, id: randomUUID(), asistencias: [{ alumno_id: ANA, fecha: 'ayer', estado: 'falta' }] }, sesion.token)).status, 400);

  const { body: alertas } = await api('/alertas', null, sesion.token);
  assert.ok(alertas.length >= 1, 'debe haber alertas de rezago');
  assert.ok(enviados.length >= 1, 'debe notificar por Telegram');
  assert.equal((await api('/alertas', null, 'token-falso')).status, 401);
});
