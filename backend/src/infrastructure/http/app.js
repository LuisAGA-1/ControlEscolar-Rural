// Adaptador de entrada: API REST con Express.
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { ErrorValidacion } from '../../domain/registros.js';
import { ErrorPermiso } from '../../domain/permisos.js';

export function crearApp({ casos, secreto, ping }) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  const ruta = (fn) => (req, res) =>
    Promise.resolve()
      .then(() => fn(req, res)) // así también se atrapan los errores que fn lanza al instante
      .then((datos) => res.headersSent || res.json(datos)) // un archivo (PDF) ya se mandó solo
      .catch((e) => {
        if (e instanceof ErrorValidacion) return res.status(400).json({ error: e.message });
        if (e instanceof ErrorPermiso) return res.status(403).json({ error: e.message });
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
  app.post('/api/auth/login', ruta((req) => casos.iniciarSesion(req.body.usuario ?? req.body.email, req.body.password)));
  app.get('/api/catalogo', autenticado, ruta((req) => casos.catalogo(req.usuario)));
  app.post('/api/registros', autenticado, ruta((req) => casos.guardarRegistros(req.usuario, req.body)));
  app.get('/api/registros', autenticado, ruta((req) => casos.registrosDeClase(req.usuario, req.query)));
  app.get('/api/calificaciones', autenticado, ruta((req) => casos.calificaciones(req.usuario, req.query.alumno_id)));
  app.get('/api/kardex', autenticado, ruta((req) => casos.kardex(req.usuario, req.query.alumno_id)));
  app.get('/api/constancias/verificar', ruta((req) => casos.verificarConstancia(req.query.folio, req.query.codigo)));
  app.post('/api/constancias', autenticado, ruta(async (req, res) => {
    const c = await casos.emitirConstancia(req.usuario, req.body);
    res.type('application/pdf').attachment(`constancia-${c.folio}.pdf`).send(c.archivo);
  }));
  app.get('/api/reportes/escuela', autenticado, ruta((req) => casos.reporteEscuela(req.usuario)));
  app.get('/api/reportes/grupo/:id', autenticado, ruta((req) => casos.reporteGrupo(req.usuario, req.params.id)));
  app.get('/api/alertas', autenticado, ruta((req) => casos.alertas(req.usuario)));
  return app;
}
