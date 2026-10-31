import React from 'react';
import { Avatar } from './SimList';

const num = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "1.573,37"; com `signed`, "+1.573,37" / "−1.573,37". Zero vira traço. */
function fmt(v, signed = false) {
  const r = Math.round(v * 100) / 100;
  if (r === 0) return '—';
  const sign = r < 0 ? '−' : signed ? '+' : '';
  return `${sign}${num.format(Math.abs(r))}`;
}

const STATUS_TEXT = { negative: 'No vermelho', tight: 'No limite', ok: 'No verde', nodata: 'Sem lançamentos' };

/**
 * A conta do período em uma tabela: o cenário atual (o que já está lançado),
 * uma linha por simulação ligada, o impacto delas e a sobra final de cada mês.
 * A coluna Total soma só os meses com lançamentos, como o resumo do topo, então
 * cada linha fecha com o número mostrado no fim dela.
 */
export default function ScenarioTable({ composed, rows, selected, onSelect, offCount }) {
  const { months, totals } = composed;
  const active = rows.filter((r) => r.sim.enabled || r.isDraft);
  const colCls = (i, extra = '') => [extra, i === selected ? 'is-selected' : '', months[i].hasData ? '' : 'is-nodata']
    .filter(Boolean).join(' ');
  const counted = (fn) => months.reduce((acc, m, i) => (m.hasData ? acc + fn(m, i) : acc), 0);

  return (
    <section className="wf-panel wf-table-panel" aria-labelledby="wf-table-title">
      <header className="wf-table-head">
        <div>
          <h2 className="wf-h2" id="wf-table-title">Mês a mês</h2>
          <p className="wf-sub">Valores em R$. Cada mês fecha sozinho, sem levar saldo para o próximo.</p>
        </div>
        {offCount > 0 && (
          <p className="wf-table-off">
            {offCount === 1 ? '1 simulação desligada não entra' : `${offCount} simulações desligadas não entram`} na conta
          </p>
        )}
      </header>

      <div className="wf-table-scroll">
        <table className="wf-table">
          <thead>
            <tr>
              <th scope="col" className="wf-t-label"><span className="wf-sr">Linha</span></th>
              {months.map((m, i) => (
                <th key={m.ym} scope="col" className={colCls(i, 'wf-t-month')}>
                  <button type="button" onClick={() => onSelect(i)} aria-pressed={i === selected}>
                    {m.label}
                    {!m.hasData && <span className="wf-t-month-note">sem lançamentos</span>}
                  </button>
                </th>
              ))}
              <th scope="col" className="wf-t-total">Total</th>
            </tr>
          </thead>

          <tbody className="wf-t-group">
            <tr className="wf-t-section"><th scope="rowgroup" colSpan={months.length + 2}>Cenário atual</th></tr>
            <tr>
              <th scope="row" className="wf-t-label">Receitas lançadas</th>
              {months.map((m, i) => <td key={m.ym} className={colCls(i)}>{m.hasData ? fmt(m.income) : '—'}</td>)}
              <td className="wf-t-total">{fmt(totals.income)}</td>
            </tr>
            <tr>
              <th scope="row" className="wf-t-label">Despesas lançadas</th>
              {months.map((m, i) => <td key={m.ym} className={colCls(i)}>{m.hasData ? fmt(-m.expense) : '—'}</td>)}
              <td className="wf-t-total">{fmt(-totals.expense)}</td>
            </tr>
            <tr className="wf-t-subtotal">
              <th scope="row" className="wf-t-label">Sobra sem simulações</th>
              {months.map((m, i) => (
                <td key={m.ym} className={colCls(i, m.hasData && m.baselineResult < 0 ? 'is-neg' : '')}>
                  {m.hasData ? fmt(m.baselineResult) : '—'}
                </td>
              ))}
              <td className={`wf-t-total${totals.baselineResult < 0 ? ' is-neg' : ''}`}>{fmt(totals.baselineResult)}</td>
            </tr>
          </tbody>

          <tbody className="wf-t-group">
            <tr className="wf-t-section">
              <th scope="rowgroup" colSpan={months.length + 2}>
                Simulações ligadas <span className="wf-num">({active.filter((r) => !r.isDraft).length})</span>
              </th>
            </tr>
            {active.length === 0 ? (
              <tr>
                <th scope="row" className="wf-t-label wf-t-muted">Nenhuma ligada</th>
                {months.map((m, i) => <td key={m.ym} className={colCls(i, 'wf-t-muted')}>—</td>)}
                <td className="wf-t-total wf-t-muted">—</td>
              </tr>
            ) : active.map((row) => {
              const monthly = row.schedule?.monthly ?? [];
              return (
                <tr key={row.id} className={`wf-t-sim${row.isDraft ? ' is-draft' : ''}`}>
                  <th scope="row" className="wf-t-label">
                    <span className="wf-t-sim-name">
                      <Avatar owner={row.owner} size={22} />
                      <span title={row.name}>{row.name}</span>
                      {row.isDraft && <span className="wf-t-tag">rascunho</span>}
                    </span>
                  </th>
                  {months.map((m, i) => {
                    const v = monthly[i] ?? 0;
                    return (
                      <td key={m.ym} className={colCls(i, v > 0 ? 'is-pos' : v < 0 ? 'is-neg' : 'wf-t-muted')}>
                        {fmt(v, true)}
                      </td>
                    );
                  })}
                  <td className="wf-t-total">{fmt(counted((_, i) => monthly[i] ?? 0), true)}</td>
                </tr>
              );
            })}
            <tr className="wf-t-subtotal">
              <th scope="row" className="wf-t-label">Impacto das simulações</th>
              {months.map((m, i) => (
                <td key={m.ym} className={colCls(i, m.simTotal < 0 ? 'is-neg' : m.simTotal > 0 ? 'is-pos' : '')}>
                  {fmt(m.simTotal, true)}
                </td>
              ))}
              <td className={`wf-t-total${totals.simTotal < 0 ? ' is-neg' : totals.simTotal > 0 ? ' is-pos' : ''}`}>
                {fmt(totals.simTotal, true)}
              </td>
            </tr>
          </tbody>

          <tfoot>
            <tr className="wf-t-result">
              <th scope="row" className="wf-t-label">Sobra com simulações</th>
              {months.map((m, i) => (
                <td key={m.ym} className={colCls(i, `is-${m.status}`)} title={STATUS_TEXT[m.status]}>
                  {m.hasData ? fmt(m.result) : '—'}
                  <span className="wf-sr">, {STATUS_TEXT[m.status]}</span>
                </td>
              ))}
              <td className={`wf-t-total${totals.result < 0 ? ' is-negative' : ''}`}>{fmt(totals.result)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
