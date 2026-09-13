import React, { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';

/**
 * Barras agrupadas: uma categoria por posição no eixo x, uma série por mês.
 *
 * Diferente do BarLine, que compara duas séries fixas ao longo do tempo. Aqui
 * o tempo é a série e a categoria é a posição, que é o que permite ver numa
 * olhada quais categorias subiram de um mês para o outro.
 */
export default function GroupedBars({ labels, series }) {
  const ref = useRef();

  useEffect(() => {
    if (!ref.current) return;
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
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: '#5a7a77', font: { family: 'Outfit', size: 11 }, boxWidth: 12 } },
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
            ticks: { color: '#5a7a77', font: { family: 'Outfit', size: 10 }, maxRotation: 45, minRotation: 0 },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#5a7a77', font: { family: 'Outfit', size: 11 },
              // Milhares abreviados: com 16 categorias o eixo fica estreito e
              // "R$ 6.748,83" por tick empurra o gráfico todo.
              callback: v => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v),
            },
            grid: { color: '#1c3330' },
          },
        },
      },
    });
    return () => ch.destroy();
  }, [JSON.stringify(labels), JSON.stringify(series)]);

  return <canvas ref={ref} />;
}
