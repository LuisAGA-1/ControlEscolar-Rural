// Reglas de dominio: sin base de datos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarCalificacion, normalizarIdentificador } from '../src/domain/registros.js';
import { resumirKardex } from '../src/domain/kardex.js';
import { exigirRol, alumnoConsultado, ErrorPermiso } from '../src/domain/permisos.js';
import { interpretarIntencion, leerCodigoVinculacion, crearCodigoVinculacion, intencionesDe } from '../src/domain/asistente.js';

const UNO = '00000000-0000-4000-8000-000000000001';

test('calificación fuera de 0 a 10 se rechaza', () => {
  assert.throws(() => validarCalificacion({ alumno_id: UNO, materia_id: UNO, parcial: 1, calificacion: 11 }));
});

test('matrícula o correo', () => {
  assert.deepEqual(normalizarIdentificador(' a260001 '), { matricula: 'A260001' });
  assert.deepEqual(normalizarIdentificador('Maria.Docente@Escuela.mx'), { email: 'maria.docente@escuela.mx' });
});

test('kárdex: créditos solo de aprobadas y promedio de todas', () => {
  const k = resumirKardex([
    { calificacion: '9', creditos: 8 },
    { calificacion: '5', creditos: 6 },
    { calificacion: '6', creditos: 6 },
  ]);
  assert.equal(k.aprobadas, 2);
  assert.equal(k.creditos, 14);
  assert.equal(k.promedio, 6.67);
  assert.equal(resumirKardex([]).promedio, null);
});

test('el alumno solo se consulta a sí mismo', () => {
  assert.equal(alumnoConsultado({ rol: 'alumno', alumno_id: 'yo' }, 'otro'), 'yo');
  assert.equal(alumnoConsultado({ rol: 'administrador' }, 'otro'), 'otro');
  assert.throws(() => alumnoConsultado({ rol: 'docente' }), ErrorPermiso);
  assert.throws(() => exigirRol({ rol: 'alumno' }, 'administrador', 'docente'), ErrorPermiso);
});

test('folio y código de la constancia salen del texto aleatorio', async () => {
  const { crearFolio, validarTipoConstancia } = await import('../src/domain/constancias.js');
  assert.deepEqual(crearFolio(new Date(2026, 9, 30), 'a1b2c3d4e5f6a7b8'), { folio: 'FCA-2026-A1B2C3D4', codigo: 'E5F6A7B8' });
  assert.throws(() => validarTipoConstancia('titulo'));
});

test('el bot entiende la respuesta de la IA y solo con intenciones del rol', () => {
  assert.deepEqual(interpretarIntencion('alumno', '```json\n{"intencion":"Horario","parametros":{"dia":"Miércoles"}}\n```'), {
    intencion: 'horario', parametros: { tipo: 'estudios', dia: 'miercoles' },
  });
  assert.equal(interpretarIntencion('alumno', '{"intencion":"reporte"}').intencion, 'ayuda');
  assert.equal(interpretarIntencion('docente', 'basura').intencion, 'ayuda');
  const admin = interpretarIntencion('administrador', '{"intencion":"constancia","parametros":{}}', 'constancia con calificaciones de a260015');
  assert.deepEqual(admin.parametros, { tipo: 'calificaciones', matricula: 'A260015' });
  assert.equal(leerCodigoVinculacion('/vincular 012345'), '012345');
  assert.equal(leerCodigoVinculacion('/start@MiBot 012345'), '012345');
  assert.equal(leerCodigoVinculacion('/vincular 12345'), null);
  assert.equal(crearCodigoVinculacion('00000001ffffffff'), '000001');
  assert.ok(intencionesDe('alumno').every((i) => i.nombre !== 'alertas'));
});
