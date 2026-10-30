// Adaptador de salida: genera la constancia en PDF con pdfkit (sin navegador ni servicios externos).
import PDFDocument from 'pdfkit';

const IRIS = '#4255ff';
const GRIS = '#586380';
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
// Fecha de PostgreSQL ('2026-08-10') o Date, sin corrimientos por zona horaria.
const fechaLarga = (f) => {
  const [a, m, d] = (typeof f === 'string' ? f : f.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })).split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
};

/** @returns {import('../../application/puertos.js').GeneradorPdf} */
export function crearGeneradorPdf({ urlVerificacion = process.env.URL_PUBLICA || 'http://localhost:5173' } = {}) {
  return {
    constancia(d) {
      const doc = new PDFDocument({ size: 'LETTER', margin: 64, bufferPages: true, info: { Title: `${d.titulo} ${d.folio}` } });
      const partes = [];
      doc.on('data', (p) => partes.push(p));
      const listo = new Promise((ok, mal) => { doc.on('end', () => ok(Buffer.concat(partes))); doc.on('error', mal); });

      const a = d.alumno;
      doc.rect(0, 0, doc.page.width, 8).fill(IRIS);
      doc.fillColor(IRIS).font('Helvetica-Bold').fontSize(16).text(a.escuela, 64, 56);
      doc.fillColor(GRIS).font('Helvetica').fontSize(10).text(`Servicios escolares · ${a.municipio}, Chiapas`);
      doc.moveDown(2.5);
      doc.fillColor('#282e3e').font('Helvetica-Bold').fontSize(20).text(d.titulo.toUpperCase(), { align: 'center' });
      doc.font('Helvetica').fontSize(10).fillColor(GRIS).text(`Folio ${d.folio}`, { align: 'center' });
      doc.moveDown(2);

      const cuerpo = `Se hace constar que ${a.nombre}, con matrícula ${a.matricula}, ` +
        (a.periodo
          ? `está inscrito(a) en el ${a.semestre}° semestre, grupo ${a.grupo}, de la ${a.carrera}, en el periodo ${a.periodo} ` +
            `(del ${fechaLarga(a.inicio)} al ${fechaLarga(a.fin)}).`
          : `es alumno(a) de la ${a.carrera}.`);
      doc.fillColor('#282e3e').fontSize(12).text('A QUIEN CORRESPONDA:', { continued: false }).moveDown(0.8);
      doc.text(cuerpo, { align: 'justify', lineGap: 4 });

      if (d.kardex) {
        doc.moveDown().text(
          `Ha cursado ${d.kardex.cursadas} materias, de las cuales aprobó ${d.kardex.aprobadas}, con ${d.kardex.creditos} créditos ` +
          `y un promedio general de ${d.kardex.promedio ?? 'sin calificaciones finales'}.`,
          { align: 'justify', lineGap: 4 }
        );
        tabla(doc, 'Kárdex', ['Sem.', 'Materia', 'Créd.', 'Periodo', 'Calif.'], [36, 260, 44, 70, 50],
          d.kardex.materias.map((m) => [`${m.semestre}°`, m.materia, m.creditos, m.periodo + (m.tipo === 'extraordinario' ? ' (E)' : ''), Number(m.calificacion).toFixed(1)]));
        const porMateria = {};
        for (const p of d.parciales) (porMateria[p.materia] ??= {})[p.parcial] = Number(p.calificacion).toFixed(1);
        tabla(doc, 'Periodo en curso (parciales)', ['Materia', '1°', '2°', '3°'], [320, 50, 50, 50],
          Object.entries(porMateria).map(([m, p]) => [m, p[1] ?? '—', p[2] ?? '—', p[3] ?? '—']));
      }

      doc.moveDown(1.5).fillColor('#282e3e').fontSize(12)
        .text(`Se extiende la presente a petición del interesado(a) en Tuxtla Gutiérrez, Chiapas, el ${fechaLarga(d.fecha)}.`, 64, doc.y, { align: 'justify', lineGap: 4 });

      // Pie en cada hoja: datos para verificar la autenticidad
      const { start, count } = doc.bufferedPageRange();
      for (let i = start; i < start + count; i++) {
        doc.switchToPage(i);
        const y = doc.page.height - 120;
        doc.moveTo(64, y).lineTo(doc.page.width - 64, y).strokeColor('#d9dde8').stroke();
        doc.fontSize(9).fillColor(GRIS)
          .text(`Folio: ${d.folio}    Código de verificación: ${d.codigo}    Hoja ${i + 1} de ${count}`, 64, y + 12, { lineBreak: false })
          .text(`Verifica su autenticidad en ${urlVerificacion}/#verificar con el folio y el código.`, 64, y + 26, { lineBreak: false })
          .text('Documento generado electrónicamente; no requiere firma autógrafa.', 64, y + 40, { lineBreak: false });
      }
      doc.end();
      return listo;
    },
  };
}

function tabla(doc, titulo, columnas, anchos, filas) {
  if (!filas.length) return;
  if (doc.y > doc.page.height - 220) doc.addPage(); // el título no se queda solo al pie de la hoja
  doc.moveDown(1.2).font('Helvetica-Bold').fontSize(11).fillColor(IRIS).text(titulo, 64);
  const fila = (valores, negrita) => {
    if (doc.y > doc.page.height - 150) doc.addPage();
    const y = doc.y + 4;
    let x = 64;
    doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(negrita ? GRIS : '#282e3e');
    valores.forEach((v, i) => { doc.text(String(v), x, y, { width: anchos[i] - 6, lineBreak: false, ellipsis: true }); x += anchos[i]; });
    doc.y = y + 12;
  };
  fila(columnas, true);
  for (const f of filas) fila(f);
  doc.x = 64;
}
