import React, { useMemo, useState } from 'react';
import { R$ } from '../../../core/utils/format';
import { toCents } from '../../../core/utils/simulatorMath';
import { compact } from '../../health/widgets/HlParts';

const H = 250, L = 52, R = 12, T = 18, B = 34;

/** Agrupa as simulações além da sexta em "Outras" (uma só cor). */
function groupKey(info) { return info.slot === 'other' ? 'other' : info.sim.id; }

/**
 * Gráfico mensal empilhado, de UM eixo. Acima do zero: receita (e simulações
 * de receita). Abaixo: despesa e cada simulação de despesa ligada. O marcador é
 * a sobra do mês; mês negativo ganha "✕" no gráfico e texto na leitura.
 *
 * composed: saída de composeMonthly. infos: [{ sim, name, slot }] de TODAS as
 * simulações (a cor vem da posição, então não muda ao ligar/desligar).
 */
export default function MonthlyChart({ composed, infos }) {
  const { months, simIds } = composed;
  const n = months.length;
  const byId = useMemo(() => new Map(infos.map((i) => [i.sim.id, i])), [infos]);
  const enabledInfos = simIds.map((id) => byId.get(id)).filter(Boolean);

  // Entradas da legenda: as seis primeiras com nome; o resto vira "Outras".
  const legendSims = [];
  let othersCount = 0;
  enabledInfos.forEach((info) => {
    if (info.slot === 'other') othersCount += 1;
    else legendSims.push({ key: info.sim.id, name: info.name, slot: info.slot });
  });
  const keysInOrder = [...legendSims.map((s) => s.key), ...(othersCount ? ['other'] : [])];
  const labelOf = (key) => (key === 'other' ? `Outras (${othersCount})` : legendSims.find((s) => s.key === key).name);
  const slotOf = (key) => (key === 'other' ? 'other' : legendSims.find((s) => s.key === key).slot);

  // Pilhas por mês, em centavos para a soma não derivar.
  const stacks = months.map((m) => {
    const up = [];
    const down = [];
    if (m.income > 0) up.push({ key: 'income', c: toCents(m.income) });
    if (m.expense > 0) down.push({ key: 'expense', c: toCents(m.expense) });
    const per = new Map();
    m.sims.forEach((s) => {
      const info = byId.get(s.id);
      if (!info) return;
      const k = groupKey(info);
      per.set(k, (per.get(k) ?? 0) + toCents(s.amount));
    });
    keysInOrder.forEach((k) => {
      const v = per.get(k) ?? 0;
      if (v > 0) up.push({ key: k, c: v });
      else if (v < 0) down.push({ key: k, c: -v });
    });
    return { up, down };
  });

  const sum = (arr) => arr.reduce((a, x) => a + x.c, 0) / 100;
  let hi = Math.max(0, ...stacks.map((s) => sum(s.up)), ...months.map((m) => m.result));
  let lo = -Math.max(0, ...stacks.map((s) => sum(s.down)));
  if (hi === 0 && lo === 0) hi = 1;
  const pad = (hi - lo) * 0.08;
  if (hi > 0) hi += pad;
  if (lo < 0) lo -= pad;

  const narrow = n > 12;
  const plotW = Math.max(560, narrow ? n * 34 : 0);
  const W = L + R + plotW;
  const plotH = H - T - B;
  const band = plotW / Math.max(n, 1);
  const cx = (i) => L + band * i + band / 2;
  const y = (v) => T + plotH - ((v - lo) / (hi - lo)) * plotH;
  const bw = Math.min(30, band * 0.62);
  const ticks = [...new Set([lo, 0, hi])];
  const step = narrow ? 2 : 1;

  const firstShown = composed.firstNegative ?? composed.tightest?.index ?? 0;
  const [active, setActive] = useState(null);
  const shown = Math.min(active !== null ? active : firstShown, n - 1);

  const describe = (m) => [
    `receita ${R$(m.income)}`,
    `despesa ${R$(m.expense)}`,
    ...m.sims.map((s) => `${byId.get(s.id)?.name ?? s.id} ${R$(s.amount)}`),
    `sobra do mês ${R$(m.result)}${m.result < 0 ? ' (negativo)' : ''}`,
  ].join('; ');

  const segments = (stack, i, dir) => {
    let acc = 0;
    return stack.map((seg) => {
      const from = acc;
      acc += seg.c / 100;
      const a = dir * from;
      const b = dir * acc;
      const cls = seg.key === 'income' ? 'wi-mc-income' : seg.key === 'expense' ? 'wi-mc-expense' : `wi-mc-seg wi-cat-${slotOf(seg.key)}`;
      return (
        <rect key={`${dir}${i}${seg.key}`} x={cx(i) - bw / 2} y={Math.min(y(a), y(b))} width={bw}
          height={Math.max(Math.abs(y(a) - y(b)), 1)} className={cls} />
      );
    });
  };

  if (n === 0) return null;
  const m = months[shown];

  return (
    <figure className="wi-chart wi-mc">
      <figcaption className="wi-chart-title">
        Cada mês sozinho, sem acumular: receita acima do zero; despesa e simulações abaixo.
      </figcaption>
      <div className="wi-mc-scroll">
        <svg viewBox={`0 0 ${W} ${H}`} className="wi-chart-svg" style={narrow ? { minWidth: W } : undefined}
          role="group" aria-label="Receita, despesa e simulações de cada mês, com a sobra do mês">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="wi-grid" />
              <text x={L - 6} y={y(t) + 3} textAnchor="end" className="wi-axis">{compact(t)}</text>
            </g>
          ))}
          <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} className="wi-zero" />

          {stacks.map((s, i) => (
            <g key={months[i].label} className={shown === i ? 'wi-mc-col is-active' : 'wi-mc-col'}>
              {segments(s.up, i, 1)}
              {segments(s.down, i, -1)}
            </g>
          ))}

          {months.map((mm, i) => (mm.result < 0
            ? (
              <rect key={`r${mm.label}`} x={cx(i) - 5} y={y(mm.result) - 5} width="10" height="10"
                transform={`rotate(45 ${cx(i)} ${y(mm.result)})`} className="wi-mc-dot is-neg" />
            )
            : <circle key={`r${mm.label}`} cx={cx(i)} cy={y(mm.result)} r="4.5" className="wi-mc-dot" />
          ))}

          {months.map((mm, i) => mm.result < 0 && (
            <text key={`f${mm.label}`} x={cx(i)} y={T - 5} textAnchor="middle" className="wi-mc-flag">✕</text>
          ))}

          {months.map((mm, i) => i % step === 0 && (
            <text key={`x${mm.label}`} x={cx(i)} y={H - 12} textAnchor="middle" className="wi-axis">{mm.label}</text>
          ))}

          {months.map((mm, i) => (
            <rect key={`h${mm.label}`} x={L + band * i} y={T} width={band} height={plotH + B - 8}
              className="wi-hit" tabIndex={0} role="img" aria-label={`${mm.label}: ${describe(mm)}`}
              onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)} onBlur={() => setActive(null)} />
          ))}
        </svg>
      </div>

      <ul className="wi-legend" aria-label="Legenda">
        <li><span className="wi-swatch wi-mc-income" aria-hidden="true" /> Receita</li>
        <li><span className="wi-swatch wi-mc-expense" aria-hidden="true" /> Despesa</li>
        {keysInOrder.map((k) => (
          <li key={k}><span className={`wi-swatch wi-mc-seg wi-cat-${slotOf(k)}`} aria-hidden="true" /> {labelOf(k)}</li>
        ))}
        <li><span className="wi-mc-key" aria-hidden="true">●</span> Sobra do mês</li>
        <li><span className="wi-mc-key is-neg" aria-hidden="true">✕</span> Mês negativo</li>
      </ul>

      <p className="wi-readout" aria-live="polite">
        <span>{m.label}</span>
        <span className="wi-readout-item">Receita: <strong>{R$(m.income)}</strong></span>
        <span className="wi-readout-item">Despesa: <strong>{R$(m.expense)}</strong></span>
        {m.sims.map((s) => (
          <span key={s.id} className="wi-readout-item">{byId.get(s.id)?.name ?? s.id}: <strong>{R$(s.amount)}</strong></span>
        ))}
        <span className="wi-readout-item">
          Sobra do mês: <strong>{R$(m.result)}</strong>
          {m.result < 0 && <span className="wi-neg-tag"><span aria-hidden="true"> ✕</span> negativo</span>}
        </span>
      </p>
    </figure>
  );
}
