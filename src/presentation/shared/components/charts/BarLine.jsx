import React, { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';

export default function BarLine({ labels, income, expenses }) {
  const ref = useRef();

  useEffect(() => {
    if (!ref.current) return;
    const ch = new Chart(ref.current.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Receitas', data: income,   backgroundColor: '#4ade8033', borderColor: '#4ade80', borderWidth: 1.5, borderRadius: 5 },
          { label: 'Despesas', data: expenses, backgroundColor: '#f8717133', borderColor: '#f87171', borderWidth: 1.5, borderRadius: 5 },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#5a7a77', font: { family: 'Outfit', size: 11 } } },
        },
        scales: {
          x: { ticks: { color: '#5a7a77', font: { family: 'Outfit', size: 11 } }, grid: { color: '#1c3330' } },
          y: { ticks: { color: '#5a7a77', font: { family: 'Outfit', size: 11 }, callback: v => 'R$' + v }, grid: { color: '#1c3330' } },
        },
      },
    });
    return () => ch.destroy();
  }, [JSON.stringify(labels)]);

  return <canvas ref={ref} />;
}
