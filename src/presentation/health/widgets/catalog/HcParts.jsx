import React, { useState } from 'react';
import { R$ } from '../../../../core/utils/format';
import { compact } from '../HlParts';

/**
 * Peças compartilhadas pelos widgets do catálogo (prefixo Hc).
 * Todas são HTML/SVG, com foco por teclado e a mesma leitura no foco e no hover.
 */

/** Tabela equivalente ao gráfico. columns: { label, render(row) }; a primeira coluna é o cabeçalho da linha. */
export function HcTable({ columns, rows, rowKey, footer }) {
  return (
    <div className="hl-table-wrap">
      <table className="hl-table">
        <thead>
          <tr>{columns.map(c => <th key={c.label} scope="col">{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey(r, i)}>
              {columns.map((c, j) => (j === 0
                ? <th key={c.label} scope="row">{c.render(r)}</th>
                : <td key={c.label}>{c.render(r)}</td>))}
            </tr>
          ))}
        </tbody>
        {footer && <tfoot><tr>{footer.map((f, i) => (i === 0 ? <th key={i} scope="row">{f}</th> : <td key={i}>{f}</td>))}</tr></tfoot>}
      </table>
    </div>
  );
}

/** Seletor segmentado (ex.: janela de 3/6/12 meses). options: { id, label }. */
export function HcSegment({ options, value, onChange, label }) {
  return (
    <div className="hl-toggle" role="group" aria-label={label}>
      {options.map(o => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}

/** Legenda: quadrado (série) ou traço (linha) + nome, opcionalmente com valor. */
export function HcLegend({ items }) {
  return (
    <ul className="hl-legend hl-legend-inline">
      {items.map(i => (
        <li key={i.key}>
          <span className={`hl-swatch ${i.cls}`} aria-hidden="true" />
          <span>{i.label}</span>
          {i.value !== undefined && <strong>{i.value}</strong>}
        </li>
      ))}
    </ul>
  );
}

/**
 * Barra horizontal empilhada de uma medida só (partes de um todo): até 6
 * cores categóricas validadas e cinza para "Outras". Cada segmento é focável;
 * a legenda traz nome, valor e participação, então nada depende só da cor.
 *
 * items: { key, label, value, valueText, detail, isOther }
 */
export function HcStackBar({ items, ariaLabel }) {
  const cls = (it, i) => (it.isOther ? 'hl-cat-other' : `hl-cat-${(i % 6) + 1}`);
  return (
    <div>
      <div className="hl-stack hl-stack-tall" role="group" aria-label={ariaLabel}>
        {items.map((it, i) => (
          <span key={it.key} className={`hl-stack-seg ${cls(it, i)}`} style={{ flexGrow: Math.max(it.value, 0) }}
            tabIndex={0} title={it.detail} aria-label={it.detail} role="img" />
        ))}
      </div>
      <ul className="hl-legend">
        {items.map((it, i) => (
          <li key={it.key}>
            <span className={`hl-swatch ${cls(it, i)}`} aria-hidden="true" />
            <span>{it.icon && it.icon !== '…' ? `${it.icon} ` : ''}{it.label}</span>
            <strong>{it.valueText}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Colunas agrupadas por mês com duas séries (receita e despesa), um único
 * eixo em R$. A leitura do mês ativo aparece abaixo; o último é o padrão.
 * points: { key, label, a, b }
 */
export function HcGroupedBars({ points, labelA, labelB, ariaLabel }) {
  const [active, setActive] = useState(null);
  const W = 320, H = 160, L = 40, R = 10, T = 12, B = 24;
  const plotW = W - L - R, plotH = H - T - B;
  const hi = Math.max(...points.flatMap(p => [p.a, p.b]), 0) || 1;
  const y = (v) => T + plotH - (Math.max(v, 0) / hi) * plotH;
  const band = plotW / points.length;
  const barW = Math.min(14, band * 0.34);
  const cx = (i) => L + band * i + band / 2;
  const shown = active !== null ? active : points.length - 1;
  const p = points[shown];
  const ticks = [0, hi / 2, hi];

  return (
    <figure className="hl-evo">
      <svg viewBox={`0 0 ${W} ${H}`} className="hl-evo-svg" role="group" aria-label={ariaLabel}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="hl-grid" />
            <text x={L - 6} y={y(t) + 3} textAnchor="end" className="hl-axis">{compact(t)}</text>
          </g>
        ))}
        {points.map((pt, i) => (
          <g key={pt.key} opacity={shown === i ? 1 : 0.8}>
            <rect x={cx(i) - barW - 1} y={y(pt.a)} width={barW} height={Math.max(plotH + T - y(pt.a), 1)} rx="3" className="hl-bar-a" />
            <rect x={cx(i) + 1} y={y(pt.b)} width={barW} height={Math.max(plotH + T - y(pt.b), 1)} rx="3" className="hl-bar-b" />
            <text x={cx(i)} y={H - 7} textAnchor="middle" className="hl-axis">{pt.label}</text>
          </g>
        ))}
        {points.map((pt, i) => (
          <rect key={`h${pt.key}`} x={L + band * i} y={T} width={band} height={plotH + B - 4} className="hl-hit"
            tabIndex={0} role="img"
            aria-label={`${pt.label}: ${labelA} ${R$(pt.a)}, ${labelB} ${R$(pt.b)}`}
            onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)} onBlur={() => setActive(null)} />
        ))}
      </svg>
      <p className="hl-readout" aria-live="polite">
        <span>{p.label}</span> {labelA} <strong>{R$(p.a)}</strong> · {labelB} <strong>{R$(p.b)}</strong>
      </p>
    </figure>
  );
}

const paceLabel = (day, actual, expected) => {
  const a = actual.find(p => p.day === day);
  return `Dia ${day}: gasto ${a ? R$(a.value) : 'ainda não ocorreu'}${expected !== null ? `, esperado ${R$(expected)}` : ''}`;
};

/**
 * Duas linhas no mesmo eixo (R$ acumulado por dia): realizado (sólida, cor de
 * destaque) e esperado (tracejada, cinza). Um ponto de foco por dia.
 * actual/expected: { day, value }
 */
export function HcPaceChart({ actual, expected, days, ariaLabel }) {
  const [active, setActive] = useState(null);
  const W = 320, H = 160, L = 40, R = 10, T = 12, B = 24;
  const plotW = W - L - R, plotH = H - T - B;
  const hi = Math.max(...actual.map(p => p.value), ...expected.map(p => p.value), 0) || 1;
  const x = (d) => L + ((d - 1) / Math.max(days - 1, 1)) * plotW;
  const y = (v) => T + plotH - (v / hi) * plotH;
  const path = (list) => list.map(p => `${x(p.day).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const band = plotW / days;
  const exp = (d) => expected.find(p => p.day === d)?.value ?? null;
  const lastDay = actual.length ? actual[actual.length - 1].day : null;
  const shown = active !== null ? active : lastDay;
  const act = shown !== null ? actual.find(p => p.day === shown) : null;
  const ticks = [0, hi / 2, hi];
  const xTicks = [1, Math.ceil(days / 2), days];

  return (
    <figure className="hl-evo">
      <svg viewBox={`0 0 ${W} ${H}`} className="hl-evo-svg" role="group" aria-label={ariaLabel}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="hl-grid" />
            <text x={L - 6} y={y(t) + 3} textAnchor="end" className="hl-axis">{compact(t)}</text>
          </g>
        ))}
        {xTicks.map(d => <text key={d} x={x(d)} y={H - 7} textAnchor="middle" className="hl-axis">{d}</text>)}
        {expected.length > 1 && <polyline points={path(expected)} className="hl-line-expected" />}
        {actual.length > 1 && <polyline points={path(actual)} className="hl-line" />}
        {actual.length > 0 && <circle cx={x(lastDay)} cy={y(actual[actual.length - 1].value)} r="4" className="hl-dot" />}
        {Array.from({ length: days }, (_, i) => i + 1).map(d => (
          <rect key={d} x={x(d) - band / 2} y={T} width={band} height={plotH + B - 4} className="hl-hit" tabIndex={0} role="img"
            aria-label={paceLabel(d, actual, exp(d))}
            onMouseEnter={() => setActive(d)} onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(d)} onBlur={() => setActive(null)} />
        ))}
      </svg>
      <p className="hl-readout" aria-live="polite">
        {shown === null ? 'Sem dias decorridos.' : (
          <>Dia <strong>{shown}</strong> · gasto <strong>{act ? R$(act.value) : '—'}</strong>
            {exp(shown) !== null && <> · esperado <strong>{R$(exp(shown))}</strong></>}</>
        )}
      </p>
    </figure>
  );
}
