import React, { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';

export default function Donut({ data, labels, colors }) {
  const ref = useRef();

  useEffect(() => {
    if (!ref.current || !data.length) return;
    const ch = new Chart(ref.current.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#0d1f1d' }],
      },
      options: {
        responsive: true,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#5a7a77', boxWidth: 10, font: { family: 'Outfit', size: 11 } },
          },
        },
      },
    });
    return () => ch.destroy();
  }, [JSON.stringify(data)]);

  return <canvas ref={ref} />;
}
