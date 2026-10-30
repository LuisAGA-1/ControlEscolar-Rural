// Adaptador de entrada: API REST con Express.
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { ErrorValidacion } from '../../domain/registros.js';

export function crearApp({ casos, secreto, ping }) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  const ruta = (fn) => (req, res) =>
    Promise.resolve(fn(req, res))
      .then((datos) => res.json(datos))
      .catch((e) => {
        if (e instanceof ErrorValidacion) return res.status(400).json({ error: e.message });
        console.error(e);
        res.status(500).json({ error: 'Error interno: ' + e.message });
      });

  function autenticado(req, res, next) {
    try {
      req.usuario = jwt.verify((req.headers.authorization ?? '').replace('Bearer ', ''), secreto);
      next();
    } catch {
      res.status(401).json({ error: 'Sesión no válida, vuelve a iniciar sesión' });
    }
  }

  app.get('/api/health', ruta(ping));
  app.post('/api/auth/login', ruta((req) => casos.iniciarSesion(req.body.email, req.body.password)));
  app.get('/api/catalogo', autenticado, ruta((req) => casos.catalogo(req.usuario)));
  app.post('/api/registros', autenticado, ruta((req) => casos.guardarRegistros(req.usuario, req.body)));
  app.get('/api/alertas', autenticado, ruta((req) => casos.alertas(req.usuario)));
  return app;
}
