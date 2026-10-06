import React, { useState } from 'react';
import { R$ } from '../../../core/utils/format';
import { compact } from '../../health/widgets/HlParts';

/**
 * Gráfico SVG de UM eixo com duas séries (base x com simulações), em colunas
 * ou linhas. Cada mês é uma faixa focável por teclado; a leitura do mês ativo
 * aparece abaixo e meses negativos ganham marca (losango/borda) E texto.
 *
 * series: [{ key, label, tone: 'base'|'scenario', values: number[] }]
 * months: [{ key, axis, long }]  (axis = rótulo curto do eixo, long = rótulo falado)
 */
export default function WiChart({ title, kind, series, months, ariaLabel }) {
  const [active, setActive] = useState(null);
  const W = 640, H = 210, L = 52, R = 12, T = 14, B = 28;
  const plotW = W - L - R, plotH = H - T - B;
  const n = months.length;

  const all = series.flatMap((s) => s.values);
  let lo = Math.min(0, ...all), hi = Math.max(0, ...all);
  if (hi === lo) hi = lo + 1;
  const pad = (hi - lo) * 0.08;
  if (hi > 0) hi += pad;
  if (lo < 0) lo -= pad;

  const band = plotW / Math.max(n, 1);
  const cx = (i) => L + band * i + band / 2;
  const y = (v) => T + plotH - ((v - lo) / (hi - lo)) * plotH;
  const ticks = [lo, (lo + hi) / 2, hi];
  const step = Math.max(1, Math.ceil(n / 10));

  const shown = active !== null ? active : n - 1;
  const bw = Math.min(16, band * 0.36);

  const describe = (i) => series
    .map((s) => `${s.label} ${R$(s.values[i])}${s.values[i] < 0 ? ' (negativo)' : ''}`)
    .join('; ');

  return (
    <figure className="wi-chart">
      <figcaption className="wi-chart-title">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="wi-chart-svg" role="group" aria-label={ariaLabel}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="wi-grid" />
            <text x={L - 6} y={y(t) + 3} textAnchor="end" className="wi-axis">{compact(t)}</text>
          </g>
        ))}
        {lo < 0 && hi > 0 && <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} className="wi-zero" />}

        {kind === 'columns' && series.map((s, si) => s.values.map((v, i) => {
          const x = cx(i) + (si === 0 ? -bw - 1 : 1);
          return (
            <rect key={`${s.key}${i}`} x={x} y={Math.min(y(v), y(0))} width={bw} height={Math.max(Math.abs(y(v) - y(0)), 1)}
              rx="2" className={`wi-bar wi-bar-${s.tone}${shown === i ? ' is-active' : ''}${v < 0 ? ' is-neg' : ''}`} />
          );
        }))}

        {kind === 'lines' && series.map((s) => (
          <polyline key={s.key} className={`wi-line wi-line-${s.tone}`}
            points={s.values.map((v, i) => `${cx(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')} />
        ))}
        {kind === 'lines' && series.map((s) => s.values.map((v, i) => (
          v < 0
            ? <rect key={`${s.key}${i}`} x={cx(i) - 4} y={y(v) - 4} width="8" height="8" transform={`rotate(45 ${cx(i)} ${y(v)})`}
              className={`wi-dot wi-dot-${s.tone} is-neg`} />
            : <circle key={`${s.key}${i}`} cx={cx(i)} cy={y(v)} r={shown === i ? 5 : 3.5} className={`wi-dot wi-dot-${s.tone}`} />
        )))}

        {months.map((m, i) => (i % step === 0 || i === n - 1) && (
          <text key={`x${m.key}`} x={cx(i)} y={H - 9} textAnchor="middle" className="wi-axis">{m.axis}</text>
        ))}

        {months.map((m, i) => (
          <rect key={`h${m.key}`} x={L + band * i} y={T} width={band} height={plotH + B - 4}
            className="wi-hit" tabIndex={0} role="img" aria-label={`${m.long}: ${describe(i)}`}
            onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)} onBlur={() => setActive(null)} />
        ))}
      </svg>

      <ul className="wi-legend" aria-label="Legenda">
        {series.map((s) => (
          <li key={s.key}>
            <span className={`wi-swatch wi-swatch-${kind}-${s.tone}`} aria-hidden="true" />
            {s.label}
          </li>
        ))}
        <li><span className="wi-swatch-neg" aria-hidden="true">◆</span> Valor negativo</li>
      </ul>

      <p className="wi-readout" aria-live="polite">
        <span>{months[shown]?.long}</span>
        {series.map((s) => {
          const v = s.values[shown];
          return (
            <span key={s.key} className="wi-readout-item">
              {s.label}: <strong>{R$(v)}</strong>
              {v < 0 && <span className="wi-neg-tag"><span aria-hidden="true"> ✕</span> negativo</span>}
            </span>
          );
        })}
      </p>
    </figure>
  );
}
