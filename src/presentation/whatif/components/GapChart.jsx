import React, { useMemo, useState } from 'react';
import { signedMoney } from '../../simulator/logic/labels';
import { niceScale, moneyShort, tickLabel } from '../logic/scale';
import { useWidth, simColor, money, activeRows, simAt } from '../logic/chartKit';
import ChartTip from './ChartTip';

const L = 56, R = 120, T = 24, PLOT = 230, AX = 30, LANE = 36, LANES_TOP = 22;

/**
 * Linha de sobra. Duas linhas no mesmo eixo: a sobra de hoje (cinza) e a sobra
 * com as simulações ligadas. A faixa entre elas é o efeito das simulações:
 * vermelha onde tiram, verde onde põem. Abaixo, na mesma régua de meses, uma
 * faixa por simulação mostra quando ela pesa.
 */
export default function GapChart({ composed, rows, hoverId, selected, onSelect }) {
  const [ref, width] = useWidth();
  const [tip, setTip] = useState(null);
  const { months } = composed;
  const n = months.length;
  const active = activeRows(rows);

  const scale = useMemo(() => {
    const vals = months.filter((m) => m.hasData).flatMap((m) => [m.baselineResult, m.result]);
    return niceScale(vals.length ? vals : [0]);
  }, [months]);

  const plotW = Math.max(width - L - R, n * 60);
  const W = L + R + plotW;
  const band = plotW / n;
  const cx = (i) => L + band * i + band / 2;
  const y = (v) => T + ((scale.max - v) / (scale.max - scale.min)) * PLOT;
  const lanesY = T + PLOT + AX + LANES_TOP;
  const H = lanesY + Math.max(active.length, 1) * LANE + 6;

  // Trechos de meses seguidos com lançamentos: as linhas não atravessam um mês sem dados.
  const runs = [];
  months.forEach((m, i) => {
    if (!m.hasData) return;
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1] === i - 1) last.push(i); else runs.push([i]);
  });
  const path = (key) => runs.map((r) => r.map((i, k) => `${k ? 'L' : 'M'}${cx(i)},${y(months[i][key])}`).join('')).join('');

  // Faixa entre as linhas, cortada onde elas se cruzam.
  const gaps = [];
  runs.forEach((r) => r.slice(0, -1).forEach((i) => {
    const a = months[i];
    const b = months[i + 1];
    const da = a.result - a.baselineResult;
    const db = b.result - b.baselineResult;
    const pt = (t, key) => [cx(i) + band * t, y(a[key] + (b[key] - a[key]) * t)];
    const poly = (t0, t1, sign) => {
      if (sign === 0) return;
      const pts = [pt(t0, 'baselineResult'), pt(t1, 'baselineResult'), pt(t1, 'result'), pt(t0, 'result')];
      gaps.push({ key: `${i}-${t0}`, d: pts.map((p) => p.join(',')).join(' '), neg: sign < 0 });
    };
    if (da * db < 0) {
      const t = da / (da - db);
      poly(0, t, Math.sign(da));
      poly(t, 1, Math.sign(db));
    } else poly(0, 1, Math.sign(da || db));
  }));

  // Trechos de cada simulação nas faixas de baixo.
  const lanes = active.map((row) => {
    const segs = [];
    months.forEach((_, i) => {
      const v = simAt(row, i);
      if (!v) return;
      const last = segs[segs.length - 1];
      if (last && last.end === i - 1) {
        last.end = i; last.sum += v;
        if (Math.abs(v - last.first) >= 1) last.steady = false;   // centavos da última parcela não contam
      } else segs.push({ start: i, end: i, first: v, sum: v, steady: true });
    });
    return { row, segs };
  });

  const lastI = runs.length ? runs[runs.length - 1].slice(-1)[0] : null;
  const worst = composed.tightest?.index ?? null;

  const tipFor = (i) => {
    const m = months[i];
    const lines = [{
      key: 'base', color: m.hasData ? 'var(--wf-base)' : null, muted: !m.hasData,
      label: m.hasData ? 'Sobra sem simulações' : 'Sem lançamentos, fica fora da conta',
      value: m.hasData ? money(m.baselineResult) : '',
    }];
    active.forEach((r) => {
      const v = simAt(r, i);
      if (v) lines.push({ key: r.id, color: simColor(r.slot), label: r.name, value: signedMoney(v) });
    });
    return {
      title: m.label, lines,
      total: m.hasData ? { label: 'Fecha o mês com', value: money(m.result), neg: m.result < 0 } : null,
    };
  };

  const below = y(0) < T + PLOT;
  return (
    <figure className="wf-viz">
      <div className="wf-viz-scroll" ref={ref}>
        <div className="wf-viz-canvas" style={{ width: W }}>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="wf-svg" role="group"
            aria-label="Sobra de cada mês hoje e com as simulações, e quando cada simulação pesa">
            {selected !== null && (
              <rect x={L + band * selected + 2} y={T - 14} width={band - 4} height={H - T + 10} rx="8" className="wf-svg-sel" />
            )}
            {below && <rect x={L} y={y(0)} width={plotW} height={T + PLOT - y(0)} className="wf-svg-redzone" />}
            {scale.ticks.map((t) => (
              <g key={t}>
                <line x1={L} x2={L + plotW} y1={y(t)} y2={y(t)} className={t === 0 ? 'wf-svg-zero' : 'wf-svg-grid'} />
                <text x={L - 10} y={y(t) + 4} textAnchor="end" className="wf-svg-axis">{tickLabel(t)}</text>
              </g>
            ))}

            {gaps.map((g) => <polygon key={g.key} points={g.d} className={`wf-svg-gap${g.neg ? ' is-neg' : ''}`} />)}
            {n === 1 && months[0].hasData && (
              <line x1={cx(0)} x2={cx(0)} y1={y(months[0].baselineResult)} y2={y(months[0].result)}
                className={`wf-svg-gapline${months[0].result < months[0].baselineResult ? ' is-neg' : ''}`} />
            )}

            <path d={path('baselineResult')} className="wf-svg-line is-base" />
            <path d={path('result')} className="wf-svg-line is-after" />
            {months.map((m, i) => m.hasData && (
              <g key={m.ym}>
                <circle cx={cx(i)} cy={y(m.baselineResult)} r="3.5" className="wf-svg-dot is-base" />
                <circle cx={cx(i)} cy={y(m.result)} r="4.5" className={`wf-svg-dot is-after${m.result < 0 ? ' is-neg' : ''}`} />
              </g>
            ))}

            {/* Rótulos seletivos: o fim de cada linha e o pior mês. */}
            {lastI !== null && (
              <>
                <text x={cx(lastI) + 12} y={y(months[lastI].result) + 4} className="wf-svg-end">
                  Com simulações <tspan className="wf-svg-end-val">{moneyShort(months[lastI].result)}</tspan>
                </text>
                <text x={cx(lastI) + 12} y={y(months[lastI].baselineResult) + 4 + (Math.abs(y(months[lastI].baselineResult) - y(months[lastI].result)) < 16 ? (months[lastI].baselineResult > months[lastI].result ? -14 : 14) : 0)}
                  className="wf-svg-end is-base">
                  Hoje <tspan className="wf-svg-end-val">{moneyShort(months[lastI].baselineResult)}</tspan>
                </text>
              </>
            )}
            {worst !== null && worst !== lastI && months[worst].hasData && (
              <text x={cx(worst)} y={y(months[worst].result) + (months[worst].result < 0 ? 22 : -12)} textAnchor="middle"
                className={`wf-svg-val${months[worst].result < 0 ? ' is-neg' : ''}`}>
                {moneyShort(months[worst].result)}
              </text>
            )}

            {months.map((m, i) => (
              <text key={`x${m.ym}`} x={cx(i)} y={T + PLOT + 22} textAnchor="middle"
                className={`wf-svg-month${m.status === 'negative' ? ' is-neg' : ''}${i === selected ? ' is-sel' : ''}`}>
                {m.label}
              </text>
            ))}

            <text x={L} y={lanesY - 8} className="wf-svg-lanes-title">Quando cada simulação pesa</text>
            {lanes.length === 0 && (
              <text x={L} y={lanesY + 16} className="wf-svg-axis">Nenhuma simulação ligada.</text>
            )}
            {lanes.map((ln, k) => {
              const top = lanesY + k * LANE;
              const faded = hoverId && hoverId !== ln.row.id;
              return (
                <g key={ln.row.id} className={faded ? 'is-faded' : undefined}>
                  <line x1={L} x2={L + plotW} y1={top + LANE - 4} y2={top + LANE - 4} className="wf-svg-grid" />
                  {ln.segs.map((s) => {
                    const x0 = L + band * s.start + 3;
                    const x1 = L + band * (s.end + 1) - 3;
                    const each = s.end > s.start && s.steady;
                    return (
                      <g key={s.start}>
                        <rect x={x0} y={top + 18} width={Math.max(x1 - x0, 4)} height="8" rx="4" fill={simColor(ln.row.slot)} />
                        <text x={x0} y={top + 12} className="wf-svg-lane-label">
                          {ln.row.name}
                          <tspan className="wf-svg-lane-val"> {each ? `${signedMoney(s.first)}/mês` : signedMoney(s.sum)}</tspan>
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {months.map((m, i) => (
              <rect key={`hit${m.ym}`} x={L + band * i} y={T - 14} width={band} height={H - T + 10}
                className="wf-svg-hit" tabIndex={0} role="button" aria-pressed={i === selected}
                aria-label={`${m.label}: ${m.hasData ? `hoje ${money(m.baselineResult)}, com simulações ${money(m.result)}` : 'sem lançamentos'}`}
                onMouseEnter={() => setTip(i)} onMouseLeave={() => setTip(null)}
                onFocus={() => setTip(i)} onBlur={() => setTip(null)} onClick={() => onSelect(i)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i); } }} />
            ))}
            {tip !== null && <line x1={cx(tip)} x2={cx(tip)} y1={T - 6} y2={T + PLOT} className="wf-svg-cross" />}
          </svg>
          {tip !== null && <ChartTip x={cx(tip)} y={T} width={W} {...tipFor(tip)} />}
        </div>
      </div>

      <ul className="wf-viz-legend" aria-label="Legenda">
        <li><span className="wf-lg-line is-base" aria-hidden="true" />Sobra hoje</li>
        <li><span className="wf-lg-line is-after" aria-hidden="true" />Sobra com simulações</li>
        <li><span className="wf-lg-swatch is-gap-neg" aria-hidden="true" />Simulações tiram</li>
        <li><span className="wf-lg-swatch is-gap-pos" aria-hidden="true" />Simulações põem</li>
      </ul>
    </figure>
  );
}
