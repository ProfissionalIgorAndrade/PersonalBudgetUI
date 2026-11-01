import React, { useState } from 'react';
import { signedMoney } from '../../simulator/logic/labels';
import { moneyShort } from '../logic/scale';
import { simColor, money, activeRows, simAt } from '../logic/chartKit';
import { Avatar } from './SimList';

const STATUS_TEXT = { negative: 'no vermelho', tight: 'no limite', ok: 'no verde', nodata: 'sem lançamentos' };

/**
 * Cascata. Em cima, os meses (e o período todo) para escolher; embaixo, a conta
 * do que foi escolhido como uma escada: começa na sobra de hoje, cada simulação
 * ligada é um degrau da cor dela (para a esquerda tira, para a direita põe) e o
 * último degrau é onde fecha. As simulações vêm da que mais pesa para a que
 * menos pesa.
 */
export default function CascadeChart({ composed, rows, hoverId, selected, onSelect }) {
  const [scope, setScope] = useState('month');
  const { months, totals, countedCount } = composed;
  const active = activeRows(rows);
  const isPeriod = scope === 'period';
  const m = months[selected];

  const base = isPeriod ? totals.baselineResult : (m.hasData ? m.baselineResult : 0);
  const result = isPeriod ? totals.result : (m.hasData ? m.result : base + m.simTotal);
  const steps = active
    .map((row) => ({ row, v: isPeriod ? row.total : simAt(row, selected) }))
    .filter((s) => Math.round(s.v * 100) !== 0)
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v));

  let acc = base;
  const items = steps.map((s) => { const from = acc; acc += s.v; return { ...s, from, to: acc }; });
  const pts = [0, base, result, ...items.flatMap((s) => [s.from, s.to])];
  let lo = Math.min(...pts);
  let hi = Math.max(...pts);
  if (lo === hi) hi = lo + 1;
  const pad = (hi - lo) * 0.04;
  lo -= lo < 0 ? pad : 0;
  hi += pad;
  const pct = (v) => ((v - lo) / (hi - lo)) * 100;
  const bar = (a, b) => ({ left: `${pct(Math.min(a, b))}%`, width: `max(${pct(Math.max(a, b)) - pct(Math.min(a, b))}%, 2px)` });
  const title = isPeriod ? `Período todo (${countedCount} ${countedCount === 1 ? 'mês' : 'meses'})` : m.label;
  const neg = result < 0;

  return (
    <figure className="wf-viz wf-cs">
      <div className="wf-cs-strip" role="group" aria-label="Escolha o mês">
        <button type="button" className={`wf-cs-pick is-period${isPeriod ? ' is-on' : ''}`} aria-pressed={isPeriod} onClick={() => setScope('period')}>
          <span className="wf-cs-pick-label">Período</span>
          <span className={`wf-cs-pick-val wf-num${totals.result < 0 ? ' is-neg' : ''}`}>{moneyShort(totals.result)}</span>
        </button>
        {months.map((mm, i) => {
          const on = !isPeriod && i === selected;
          return (
            <button
              key={mm.ym} type="button" className={`wf-cs-pick is-${mm.status}${on ? ' is-on' : ''}`} aria-pressed={on}
              aria-label={`${mm.label}: ${mm.hasData ? `fecha com ${money(mm.result)}, ${STATUS_TEXT[mm.status]}` : 'sem lançamentos'}`}
              onClick={() => { setScope('month'); onSelect(i); }}
            >
              <span className="wf-cs-pick-label">{mm.label}</span>
              <span className={`wf-cs-pick-val wf-num${mm.hasData && mm.result < 0 ? ' is-neg' : ''}`}>
                {mm.hasData ? moneyShort(mm.result) : '—'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="wf-cs-head">
        <h3 className="wf-cs-title">{title}</h3>
        <p className={`wf-cs-verdict${neg ? ' is-neg' : ''}`}>
          {!isPeriod && !m.hasData
            ? 'Mês ainda sem lançamentos: fica fora da conta do período.'
            : <>Fecha com <strong className="wf-num">{money(result)}</strong>{steps.length > 0 && <> (hoje seria <span className="wf-num">{money(base)}</span>)</>}</>}
        </p>
      </div>

      <ol className="wf-cs-rows">
        <li className="wf-cs-row is-total">
          <span className="wf-cs-label">Sobra sem simulações</span>
          <span className="wf-cs-track">
            <span className="wf-cs-zero" style={{ left: `${pct(0)}%` }} />
            <span className="wf-cs-bar is-base" style={bar(0, base)} />
          </span>
          <span className="wf-cs-val wf-num">{money(base)}</span>
        </li>
        {items.map((s) => (
          <li key={s.row.id} className={`wf-cs-row${hoverId && hoverId !== s.row.id ? ' is-faded' : ''}${s.row.isDraft ? ' is-draft' : ''}`}>
            <span className="wf-cs-label">
              <span className="wf-lg-swatch" style={{ background: simColor(s.row.slot) }} aria-hidden="true" />
              <Avatar owner={s.row.owner} size={20} />
              <span className="wf-cs-name" title={s.row.name}>{s.row.name}</span>
            </span>
            <span className="wf-cs-track">
              <span className="wf-cs-zero" style={{ left: `${pct(0)}%` }} />
              <span className="wf-cs-link" style={{ left: `${pct(s.from)}%` }} />
              <span className="wf-cs-bar" style={{ ...bar(s.from, s.to), background: simColor(s.row.slot) }} />
            </span>
            <span className="wf-cs-val wf-num">{signedMoney(s.v)}</span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="wf-cs-row is-empty">
            <span className="wf-cs-label">Nenhuma simulação ligada pesa {isPeriod ? 'no período' : 'neste mês'}</span>
            <span className="wf-cs-track" />
            <span className="wf-cs-val wf-num">—</span>
          </li>
        )}
        <li className={`wf-cs-row is-total is-result${neg ? ' is-neg' : ''}`}>
          <span className="wf-cs-label">Sobra com simulações</span>
          <span className="wf-cs-track">
            <span className="wf-cs-zero" style={{ left: `${pct(0)}%` }} />
            <span className="wf-cs-link" style={{ left: `${pct(result)}%` }} />
            <span className="wf-cs-bar is-result" style={bar(0, result)} />
          </span>
          <span className="wf-cs-val wf-num">{money(result)}</span>
        </li>
      </ol>
    </figure>
  );
}
