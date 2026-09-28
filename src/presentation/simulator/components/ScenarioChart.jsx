import React, { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';

const BRL = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

export default function ScenarioChart({ months, theme }) {
  const ref = useRef();

  useEffect(() => {
    if (!ref.current || !months?.length) return;

    const isLight   = theme === 'light';
    const tickColor = isLight ? '#8A95A4' : '#5a7a77';
    const gridColor = isLight ? '#E8EDF2' : '#1c3330';

    const labels        = months.map(m => m.label);
    const incomeData    = months.map(m => m.baseIncome);
    const baseExp       = months.map(m => m.baseAccountExpense + m.baseCardExpense);
    const simExp        = months.map(m => m.simulatedExpense - m.simulatedIncome); // net simulated cost
    const baseBalance   = months.map(m => m.baseBalance);
    const scenBalance   = months.map(m => m.scenarioBalance);

    const hasSimulated  = simExp.some(v => v !== 0);
    const hasNegative   = scenBalance.some(v => v < 0);

    const scenLineColor = hasNegative
      ? (isLight ? '#dc2626' : '#f87171')
      : (isLight ? '#16a34a' : '#4ade80');

    const datasets = [
      {
        type: 'bar',
        label: 'Receitas',
        data: incomeData,
        backgroundColor: isLight ? 'rgba(85,189,165,0.4)' : 'rgba(74,222,128,0.25)',
        borderColor:     isLight ? '#55BDA5' : '#4ade80',
        borderWidth: 1.5,
        borderRadius: 4,
        yAxisID: 'yBars',
        stack: 'base',
      },
      {
        type: 'bar',
        label: 'Gastos',
        data: baseExp,
        backgroundColor: isLight ? 'rgba(223,127,136,0.4)' : 'rgba(248,113,113,0.25)',
        borderColor:     isLight ? '#DF7F88' : '#f87171',
        borderWidth: 1.5,
        borderRadius: 4,
        yAxisID: 'yBars',
        stack: 'base',
      },
    ];

    if (hasSimulated) {
      datasets.push({
        type: 'bar',
        label: 'Simulado',
        data: simExp,
        backgroundColor: isLight ? 'rgba(139,92,246,0.4)' : 'rgba(167,139,250,0.25)',
        borderColor:     isLight ? '#8b5cf6' : '#a78bfa',
        borderWidth: 1.5,
        borderRadius: 4,
        yAxisID: 'yBars',
        stack: 'scenario',
      });
    }

    // Balance lines on secondary axis
    datasets.push({
      type: 'line',
      label: 'Saldo base',
      data: baseBalance,
      borderColor:     isLight ? '#94a3b8' : '#5a7a77',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderDash: [5, 4],
      pointRadius: 3,
      tension: 0.3,
      yAxisID: 'yLine',
    });

    datasets.push({
      type: 'line',
      label: 'Saldo cenário',
      data: scenBalance,
      borderColor: scenLineColor,
      backgroundColor: 'transparent',
      borderWidth: 2.5,
      pointBackgroundColor: scenBalance.map(v => v < 0
        ? (isLight ? '#dc2626' : '#f87171')
        : scenLineColor),
      pointRadius: 4,
      tension: 0.3,
      yAxisID: 'yLine',
    });

    const ch = new Chart(ref.current.getContext('2d'), {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: {
              color: tickColor,
              font: { family: 'Outfit', size: 11 },
              boxWidth: 12,
              padding: 12,
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${BRL(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: tickColor, font: { family: 'Outfit', size: 10 }, maxRotation: 45 },
            grid: { display: false },
            stacked: true,
          },
          yBars: {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            ticks: {
              color: tickColor,
              font: { family: 'Outfit', size: 11 },
              callback: v => v >= 1000 || v <= -1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
            },
            grid: { color: gridColor },
            stacked: true,
          },
          yLine: {
            type: 'linear',
            position: 'right',
            ticks: {
              color: tickColor,
              font: { family: 'Outfit', size: 11 },
              callback: v => v >= 1000 || v <= -1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
            },
            grid: { display: false },
          },
        },
      },
    });

    const ro = new ResizeObserver(() => ch.resize());
    if (ref.current.parentElement) ro.observe(ref.current.parentElement);
    return () => { ro.disconnect(); ch.destroy(); };
  }, [JSON.stringify(months), theme]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <canvas ref={ref} />
    </div>
  );
}
