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
    // Largura do card muda com a sidebar e com o próprio redimensionamento da
    // janela; sem isto o gráfico só acompanha o resize da window.
    const ro = new ResizeObserver(() => ch.resize());
    if (ref.current.parentElement) ro.observe(ref.current.parentElement);

    return () => { ro.disconnect(); ch.destroy(); };
  }, [JSON.stringify(labels), JSON.stringify(series)]);

  // O Chart.js responsivo dimensiona a partir do elemento pai. Sem um wrapper
  // posicionado e um canvas que o preencha, ele calcula a altura uma vez e não
  // reavalia - o gráfico ficava com uns 200px dentro de um container de 400 e
  // o resto do card sobrava vazio.
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}
