import React, { useMemo, useState } from 'react';
import { signedMoney } from '../../simulator/logic/labels';
import { niceScale, moneyShort, tickLabel } from '../logic/scale';
import { useWidth, simColor, money, activeRows, simAt } from '../logic/chartKit';
import ChartTip from './ChartTip';

const H = 320, L = 56, R = 16, T = 30, B = 36;

/**
 * Ponte mês a mês: cada mês é uma escada curta. A coluna cinza é a sobra de
 * hoje (só o que está lançado); a seguinte desce do topo dela com as
 * simulações de despesa, uma cor por simulação; a última sobe dali com as de
 * receita e termina exatamente onde o mês fecha (o traço). Os fios finos ligam
 * um degrau ao outro.
 */
export default function BridgeChart({ composed, rows, hoverId, selected, onSelect }) {
  const [ref, width] = useWidth();
  const [tip, setTip] = useState(null);
  const { months } = composed;
  const n = months.length;
  const active = activeRows(rows);

  // Despesas descem a partir da sobra de hoje; receitas sobem a partir de onde as despesas pararam.
  const cols = useMemo(() => months.map((m, i) => {
    const base = m.hasData ? m.baselineResult : 0;
    const out = [];
    const inc = [];
    let at = base;
    active.forEach((row) => {
      const v = simAt(row, i);
      if (v < 0) { out.push({ row, v, from: at, to: at + v }); at += v; }
    });
    const low = at;
    active.forEach((row) => {
      const v = simAt(row, i);
      if (v > 0) { inc.push({ row, v, from: at, to: at + v }); at += v; }
    });
    return { m, base, out, inc, low, end: at };
  }), [months, active]);

  const scale = useMemo(() => niceScale(cols.flatMap((c) => [c.base, c.low, c.end])), [cols]);
  const hasOut = cols.some((c) => c.out.length);
  const hasInc = cols.some((c) => c.inc.length);
  const slotsN = 1 + (hasOut ? 1 : 0) + (hasInc ? 1 : 0);

  const plotW = Math.max(width - L - R, n * (slotsN * 18 + 34));
  const W = L + R + plotW;
  const plotH = H - T - B;
  const band = plotW / n;
  const cx = (i) => L + band * i + band / 2;
  const y = (v) => T + ((scale.max - v) / (scale.max - scale.min)) * plotH;
  const GAP = 3;
  const bw = Math.max(9, Math.min(20, (band * 0.62 - GAP * (slotsN - 1)) / slotsN));
  const groupW = bw * slotsN + GAP * (slotsN - 1);
  const slotX = (i, k) => cx(i) - groupW / 2 + k * (bw + GAP);
  const OUT = 1;
  const INC = hasOut ? 2 : 1;

  const tipFor = (i) => {
    const c = cols[i];
    const lines = [];
    if (c.m.hasData) lines.push({ key: 'base', color: 'var(--wf-base)', label: 'Sobra sem simulações', value: money(c.base) });
    else lines.push({ key: 'base', label: 'Sem lançamentos, fica fora da conta', value: '', muted: true });
    [...c.out, ...c.inc].forEach((s) => lines.push({ key: s.row.id, color: simColor(s.row.slot), label: s.row.name, value: signedMoney(s.v) }));
    return {
      title: c.m.label, lines,
      total: c.m.hasData ? { label: 'Fecha o mês com', value: money(c.m.result), neg: c.m.result < 0 } : null,
    };
  };

  return (
    <figure className="wf-viz">
      <div className="wf-viz-scroll" ref={ref}>
        <div className="wf-viz-canvas" style={{ width: W }}>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="wf-svg" role="group"
            aria-label="Sobra de cada mês hoje e o efeito de cada simulação ligada">
            {months.map((m, i) => i === selected && (
              <rect key="sel" x={L + band * i + 2} y={T - 22} width={band - 4} height={plotH + 22 + B - 4} rx="8" className="wf-svg-sel" />
            ))}
            {scale.ticks.map((t) => (
              <g key={t}>
                <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className={t === 0 ? 'wf-svg-zero' : 'wf-svg-grid'} />
                <text x={L - 10} y={y(t) + 4} textAnchor="end" className="wf-svg-axis">{tickLabel(t)}</text>
              </g>
            ))}

            {cols.map((c, i) => {
              const neg = c.m.hasData && c.m.result < 0;
              const seg = (s, k) => {
                const top = Math.min(y(s.from), y(s.to));
                const h = Math.abs(y(s.from) - y(s.to));
                return (
                  <rect key={s.row.id} x={slotX(i, k)} y={top + 1} width={bw} height={Math.max(h - 2, 1.5)} rx="2"
                    fill={simColor(s.row.slot)}
                    className={`wf-svg-seg${hoverId && hoverId !== s.row.id ? ' is-faded' : ''}${s.row.isDraft ? ' is-draft' : ''}`} />
                );
              };
              const link = (k, v) => (
                <line x1={slotX(i, k - 1) + bw} x2={slotX(i, k)} y1={y(v)} y2={y(v)} className="wf-svg-link" />
              );
              return (
                <g key={c.m.ym}>
                  {c.m.hasData && Math.abs(c.base) > 0 && (
                    <rect x={slotX(i, 0)} y={Math.min(y(0), y(c.base))} width={bw} height={Math.max(Math.abs(y(c.base) - y(0)), 1)}
                      rx="3" className="wf-svg-base" />
                  )}
                  {c.out.length > 0 && link(OUT, c.base)}
                  {c.out.map((s) => seg(s, OUT))}
                  {c.inc.length > 0 && link(INC, c.low)}
                  {c.inc.map((s) => seg(s, INC))}
                  {c.m.hasData && (
                    <>
                      <line x1={slotX(i, 0) - 4} x2={slotX(i, slotsN - 1) + bw + 4} y1={y(c.m.result)} y2={y(c.m.result)}
                        className={`wf-svg-close${neg ? ' is-neg' : ''}`} />
                      <text x={cx(i)} textAnchor="middle" className={`wf-svg-val${neg ? ' is-neg' : ''}`}
                        y={neg ? Math.max(y(c.m.result), y(0)) + 17 : Math.min(y(c.m.result), y(0)) - 9}>
                        {moneyShort(c.m.result)}
                      </text>
                    </>
                  )}
                  <text x={cx(i)} y={H - 10} textAnchor="middle" className={`wf-svg-month${neg ? ' is-neg' : ''}${i === selected ? ' is-sel' : ''}`}>
                    {c.m.label}
                  </text>
                </g>
              );
            })}

            {cols.map((c, i) => (
              <rect key={`hit${c.m.ym}`} x={L + band * i} y={T - 22} width={band} height={plotH + 22 + B}
                className="wf-svg-hit" tabIndex={0} role="button" aria-pressed={i === selected}
                aria-label={`${c.m.label}: ${c.m.hasData ? `sobra hoje ${money(c.base)}, fecha com ${money(c.m.result)}` : 'sem lançamentos'}`}
                onMouseEnter={() => setTip(i)} onMouseLeave={() => setTip(null)}
                onFocus={() => setTip(i)} onBlur={() => setTip(null)} onClick={() => onSelect(i)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i); } }} />
            ))}
          </svg>
          {tip !== null && <ChartTip x={cx(tip) + groupW / 2 + 4} y={T} width={W} {...tipFor(tip)} />}
        </div>
      </div>

      <ul className="wf-viz-legend" aria-label="Legenda">
        <li><span className="wf-lg-swatch" style={{ background: 'var(--wf-base)' }} aria-hidden="true" />Sobra sem simulações</li>
        {active.map((r) => (
          <li key={r.id} className={hoverId && hoverId !== r.id ? 'is-faded' : undefined}>
            <span className="wf-lg-swatch" style={{ background: simColor(r.slot) }} aria-hidden="true" />{r.name}
          </li>
        ))}
        <li><span className="wf-lg-line" aria-hidden="true" />Onde o mês fecha</li>
      </ul>
    </figure>
  );
}
