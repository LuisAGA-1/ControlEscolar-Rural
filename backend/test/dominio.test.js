// Reglas de dominio: sin base de datos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarCalificacion, normalizarIdentificador } from '../src/domain/registros.js';
import { resumirKardex } from '../src/domain/kardex.js';
import { exigirRol, alumnoConsultado, ErrorPermiso } from '../src/domain/permisos.js';

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
