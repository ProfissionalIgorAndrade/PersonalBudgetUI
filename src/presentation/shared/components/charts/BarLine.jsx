import React, { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';

export default function BarLine({ labels, income, expenses, theme }) {
  const ref = useRef();
  const isLight = theme === 'light';

  useEffect(() => {
    if (!ref.current) return;
    const tickColor  = isLight ? '#8A95A4' : '#5a7a77';
    const gridColor  = isLight ? '#E8EDF2' : '#1c3330';
    const incFill    = isLight ? '#55BDA533' : '#4ade8033';
    const incBorder  = isLight ? '#55BDA5'   : '#4ade80';
    const expFill    = isLight ? '#DF7F8833' : '#f8717133';
    const expBorder  = isLight ? '#DF7F88'   : '#f87171';

    const ch = new Chart(ref.current.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Receitas', data: income,   backgroundColor: incFill, borderColor: incBorder, borderWidth: 1.5, borderRadius: 5 },
          { label: 'Despesas', data: expenses, backgroundColor: expFill, borderColor: expBorder, borderWidth: 1.5, borderRadius: 5 },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: tickColor, font: { family: 'Outfit', size: 11 } } },
        },
        scales: {
          x: { ticks: { color: tickColor, font: { family: 'Outfit', size: 11 } }, grid: { color: gridColor } },
          y: { ticks: { color: tickColor, font: { family: 'Outfit', size: 11 }, callback: v => 'R$' + v }, grid: { color: gridColor } },
        },
      },
    });
    return () => ch.destroy();
  }, [JSON.stringify(labels), theme]);

  return <canvas ref={ref} />;
}
