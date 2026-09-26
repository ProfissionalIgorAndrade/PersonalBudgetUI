import React, { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';

export default function Donut({ data, labels, colors, theme }) {
  const ref = useRef();

  useEffect(() => {
    if (!ref.current || !data.length) return;
    const isLight     = theme === 'light';
    const borderColor = isLight ? '#F8FAFC' : '#0d1f1d';
    const labelColor  = isLight ? '#8792A1' : '#5a7a77';

    const ch = new Chart(ref.current.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor }],
      },
      options: {
        responsive: true,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'right',
            labels: { color: labelColor, boxWidth: 10, font: { family: 'Outfit', size: 11 } },
          },
        },
      },
    });
    return () => ch.destroy();
  }, [JSON.stringify(data), theme]);

  return <canvas ref={ref} />;
}
