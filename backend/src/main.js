// Punto de arranque: conecta los adaptadores con los casos de uso (inyección de dependencias).
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { crearPool, crearRepositorioPg } from './infrastructure/persistence/repositorioPg.js';
import { crearNotificadorTelegram } from './infrastructure/notifications/telegram.js';
import { crearGeneradorPdf } from './infrastructure/pdf/constanciaPdf.js';
import { crearCasosDeUso } from './application/casosDeUso.js';
import { crearApp } from './infrastructure/http/app.js';

const secreto = process.env.JWT_SECRET;
if (!secreto) throw new Error('Falta JWT_SECRET en .env');

const pool = crearPool();
const casos = crearCasosDeUso({
  repo: crearRepositorioPg(pool),
  notificador: crearNotificadorTelegram(),
  pdf: crearGeneradorPdf(),
  azar: () => randomBytes(8).toString('hex'),
  tokens: {
    firmar: (u) => jwt.sign(u, secreto, { expiresIn: '8h' }),
    verificarPassword: (plano, hash) => bcrypt.compare(plano, hash),
  },
});
const ping = async () => {
  const { rows } = await pool.query('SELECT current_database() AS base, NOW() AS hora');
  return { ok: true, ...rows[0] };
};

const puerto = Number(process.env.PORT || 3000);
crearApp({ casos, secreto, ping }).listen(puerto, () => {
  console.log(`PostgreSQL: ${pool.options.database} en ${pool.options.host}:${pool.options.port}`);
  console.log(`API escuchando en http://localhost:${puerto}/api`);
});
