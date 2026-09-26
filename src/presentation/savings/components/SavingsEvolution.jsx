import React, { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';
import { R$ } from '../../../core/utils/format';

const label = (key) => {
  const [y, m] = key.split('-');
  return `${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][Number(m) - 1]}/${y.slice(2)}`;
};

/**
 * Evolução do guardado.
 *
 * "Guardado" e não "patrimônio": o app não aplica rendimento, então a curva é
 * o acúmulo dos depósitos e nada além disso. Chamar de patrimônio prometeria
 * algo que não acontece.
 */
export default function SavingsEvolution({ series, growth, months, onChangeMonths }) {
  const ref = useRef();

  useEffect(() => {
    if (!ref.current) return;
    const ch = new Chart(ref.current.getContext('2d'), {
      type: 'line',
      data: {
        labels: series.map(p => label(p.key)),
        datasets: [{
          label: 'Total guardado',
          data: series.map(p => p.total),
          borderColor: 'var(--primary)',
          backgroundColor: 'color-mix(in srgb, var(--primary) 16%, transparent)',
          borderWidth: 2, fill: true, tension: .35,
          pointRadius: 0, pointHoverRadius: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => R$(c.parsed.y ?? 0) } },
        },
        scales: {
          x: { ticks: { color: 'var(--muted)', font: { size: 10 } }, grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: {
              color: 'var(--muted)', font: { size: 10 },
              callback: v => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v),
            },
            grid: { color: 'var(--border)' },
          },
        },
      },
    });
    return () => ch.destroy();
  }, [JSON.stringify(series)]);

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="flex jcb aic" style={{ marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Evolução do guardado</h3>
        <select
          className="form-select"
          value={months}
          onChange={e => onChangeMonths(Number(e.target.value))}
          style={{ padding: '4px 8px', fontSize: 11, width: 'auto' }}
          aria-label="Meses exibidos"
        >
          {[6, 12, 24].map(n => <option key={n} value={n}>Últimos {n} meses</option>)}
        </select>
      </div>

      {/* Altura em pixels direto no elemento que o Chart.js mede. */}
      <div style={{ position: 'relative', width: '100%', height: '260px' }}>
        <canvas ref={ref} />
      </div>

      <div className="flex jcb aic" style={{ marginTop: 10, gap: 10, flexWrap: 'wrap' }}>
        <span className="txxs tmuted">
          O histórico começa no primeiro movimento registrado; antes disso a linha fica no saldo atual.
        </span>
        {growth.amount !== 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: growth.amount >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {growth.amount >= 0 ? '↗' : '↘'} {R$(Math.abs(growth.amount))}
            {growth.percent !== null && ` · ${growth.percent >= 0 ? '+' : ''}${growth.percent.toFixed(1)}%`}
          </span>
        )}
      </div>
    </div>
  );
}
