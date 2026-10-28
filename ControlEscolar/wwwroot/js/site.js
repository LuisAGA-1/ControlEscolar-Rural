// Efectos de la interfaz. Todo es local (sin internet) y se apaga con "reducir movimiento" del sistema.
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Tarjetas que aparecen una tras otra
document.querySelectorAll('.pagina .kpi, .pagina .tarjeta, .alerta-tarjeta, .grupo, .dia')
  .forEach((e, i) => { e.classList.add('aparece'); e.style.animationDelay = Math.min(i, 12) * 50 + 'ms'; });

// Números de los KPI que cuentan desde 0 ("87%" cuenta hasta 87 y conserva el %)
document.querySelectorAll('.kpi strong').forEach(e => {
  const m = e.textContent.trim().match(/^(\d+)(.*)$/);
  if (!m || quieto) return;
  const fin = +m[1], t0 = performance.now(), dura = 900;
  const paso = t => {
    const p = Math.min((t - t0) / dura, 1);
    e.textContent = Math.round(fin * (1 - Math.pow(1 - p, 3))) + m[2];
    if (p < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
});

// Gráficas: <canvas data-grafica='{"tipo","etiquetas","series":[{nombre,valores,color|colores}],max,limite,sufijo,apilada,horizontal}'>
// Solo en las páginas que cargan lib/chartjs.
if (window.Chart) {
  const css = getComputedStyle(document.documentElement);
  const color = n => css.getPropertyValue('--' + n).trim();
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.color = color('gris');
  Chart.defaults.borderColor = color('borde');
  if (quieto) Chart.defaults.animation = false;

  document.querySelectorAll('canvas[data-grafica]').forEach(c => {
    const g = JSON.parse(c.dataset.grafica);
    const dona = g.tipo === 'doughnut', linea = g.tipo === 'line';
    // Por punto: el color indicado, o rojo si queda por debajo del límite (p. ej. promedio < 6)
    const colores = s => s.colores ? s.colores.map(color)
      : s.valores.map(v => g.limite != null && v < g.limite ? color('rojo') : color(s.color));

    const datasets = g.series.map(s => {
      const base = { label: s.nombre, data: s.valores, backgroundColor: colores(s) };
      if (dona) return { ...base, borderWidth: 0, hoverOffset: 8 };
      if (!linea) return { ...base, borderRadius: 6, maxBarThickness: 44 };
      const linea1 = color(s.color);
      return {
        ...base, borderColor: linea1, pointBackgroundColor: colores(s), pointBorderColor: '#fff',
        pointRadius: 5, pointHoverRadius: 7, borderWidth: 3, tension: .35, fill: true,
        // Degradado bajo la línea, del acento a transparente
        backgroundColor: ({ chart: { ctx, chartArea } }) => {
          if (!chartArea) return 'transparent';
          const d = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          d.addColorStop(0, linea1 + '55'); d.addColorStop(1, linea1 + '00');
          return d;
        },
      };
    });

    new Chart(c, {
      type: g.tipo,
      data: { labels: g.etiquetas, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: dona ? '68%' : undefined,
        plugins: {
          legend: { display: dona || g.series.length > 1, position: 'bottom', labels: { usePointStyle: true, padding: 16 } },
          tooltip: { padding: 10, cornerRadius: 8, callbacks: { label: x => ` ${x.dataset.label}: ${x.formattedValue}${g.sufijo ?? ''}` } },
        },
        indexAxis: g.horizontal ? 'y' : 'x',
        scales: dona ? {} : {
          [g.horizontal ? 'y' : 'x']: { stacked: !!g.apilada, grid: { display: false } },
          [g.horizontal ? 'x' : 'y']: { stacked: !!g.apilada, beginAtZero: true, max: g.max, ticks: { precision: 0, callback: v => v + (g.sufijo ?? '') } },
        },
      },
    });
  });
}
