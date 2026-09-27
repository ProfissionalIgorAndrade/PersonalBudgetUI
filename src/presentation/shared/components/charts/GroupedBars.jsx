import React, { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';

/**
 * Barras agrupadas: uma categoria por posição no eixo x, uma série por mês.
 *
 * Diferente do BarLine, que compara duas séries fixas ao longo do tempo. Aqui
 * o tempo é a série e a categoria é a posição, que é o que permite ver numa
 * olhada quais categorias subiram de um mês para o outro.
 */
export default function GroupedBars({ labels, series, height, theme }) {
  const ref = useRef();

  // height=undefined → comportamento responsivo como BarLine (aspect ratio padrão 2:1).
  // height={px}      → altura fixa em pixels com maintainAspectRatio: false.
  const fixedHeight = height != null;

  useEffect(() => {
    if (!ref.current) return;
    const isLight   = theme === 'light';
    const tickColor = isLight ? '#8A95A4' : '#5a7a77';
    const gridColor = isLight ? '#E8EDF2' : '#1c3330';

    const ch = new Chart(ref.current.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: series.map(s => ({
          label: s.label,
          data: s.data,
          backgroundColor: s.color + '33',
          borderColor: s.color,
          borderWidth: 1.5,
          borderRadius: 4,
        })),
      },
      options: {
        responsive: true,
        ...(fixedHeight ? { maintainAspectRatio: false } : {}),
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: tickColor, font: { family: 'Outfit', size: 11 }, boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${new Intl.NumberFormat('pt-BR', {
                style: 'currency', currency: 'BRL',
              }).format(ctx.parsed.y ?? 0)}`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: tickColor, font: { family: 'Outfit', size: 10 }, maxRotation: 45, minRotation: 0 },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: tickColor, font: { family: 'Outfit', size: 11 },
              callback: v => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v),
            },
            grid: { color: gridColor },
          },
        },
      },
    });
    const ro = new ResizeObserver(() => ch.resize());
    if (ref.current.parentElement) ro.observe(ref.current.parentElement);

    return () => { ro.disconnect(); ch.destroy(); };
  }, [JSON.stringify(labels), JSON.stringify(series), theme, fixedHeight]);

  if (fixedHeight) {
    return (
      <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
        <canvas ref={ref} />
      </div>
    );
  }
  return <canvas ref={ref} />;
}
