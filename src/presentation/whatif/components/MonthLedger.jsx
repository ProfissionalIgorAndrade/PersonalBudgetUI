import React from 'react';
import { R$ } from '../../../core/utils/format';
import { signedMoney } from '../../simulator/logic/labels';

const money = (v) => (v < 0 ? `−${R$(-v)}` : R$(v));

const STATUS_TEXT = {
  negative: 'Fecha no vermelho',
  tight: 'Fecha no limite',
  ok: 'Fecha no verde',
  nodata: 'Sem lançamentos',
};

/**
 * A conta do mês escolhido, linha por linha: receita, despesas lançadas, cada
 * simulação ligada e a sobra. Os valores são os mesmos do quadro.
 */
export default function MonthLedger({ composed, rows, index, onPrev, onNext }) {
  const m = composed.months[index];
  if (!m) return null;
  const nameById = new Map(rows.map((r) => [r.id, r]));
  const sims = m.sims.filter((s) => s.amount !== 0);
  const last = composed.months.length - 1;

  return (
    <section className="wf-panel wf-ledger" aria-labelledby="wf-ledger-title" aria-live="polite">
      <header className="wf-ledger-head">
        <h2 className="wf-h2" id="wf-ledger-title">A conta de {m.label}</h2>
        <div className="wf-stepper">
          <button type="button" className="wf-icon-btn" onClick={onPrev} disabled={index === 0} aria-label="Mês anterior">
            <Chevron dir="left" />
          </button>
          <button type="button" className="wf-icon-btn" onClick={onNext} disabled={index === last} aria-label="Próximo mês">
            <Chevron dir="right" />
          </button>
        </div>
      </header>

      {!m.hasData ? (
        <p className="wf-ledger-empty">
          {m.label} ainda não tem lançamentos, então fica fora da conta do período.
          {sims.length > 0 && ` As simulações deste mês somam ${signedMoney(m.simTotal)}.`}
        </p>
      ) : (
        <table className="wf-ledger-table">
          <caption className="wf-sr">Receitas, despesas e simulações de {m.label}</caption>
          <tbody>
            <tr>
              <th scope="row">Receitas lançadas</th>
              <td className="wf-num">{signedMoney(m.income)}</td>
            </tr>
            <tr>
              <th scope="row">
                Despesas lançadas
                {m.expense > 0 && (
                  <span className="wf-ledger-note">
                    Fixas e parceladas <span className="wf-num">{R$(m.committed)}</span> · variáveis <span className="wf-num">{R$(m.variable)}</span>
                  </span>
                )}
              </th>
              <td className="wf-num">{signedMoney(-m.expense)}</td>
            </tr>
            <tr className="wf-ledger-sub">
              <th scope="row">Sem simulações sobraria</th>
              <td className="wf-num">{money(m.baselineResult)}</td>
            </tr>
            {sims.length === 0 ? (
              <tr>
                <th scope="row" className="wf-ledger-muted">Nenhuma simulação neste mês</th>
                <td className="wf-num wf-ledger-muted">—</td>
              </tr>
            ) : sims.map((s) => {
              const row = nameById.get(s.id);
              return (
                <tr key={s.id} className={row?.isDraft ? 'is-draft' : undefined}>
                  <th scope="row">
                    <span className={`wf-dot ${row?.sim.type === 'Income' ? 'is-income' : 'is-expense'}`} aria-hidden="true" />
                    {row?.name ?? 'Simulação'}
                    {row?.isDraft && <span className="wf-ledger-note">rascunho, ainda não salvo</span>}
                  </th>
                  <td className="wf-num">{signedMoney(s.amount)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className={`wf-ledger-total is-${m.status}`}>
              <th scope="row">
                Sobra do mês
                <span className="wf-ledger-status">{STATUS_TEXT[m.status]}</span>
              </th>
              <td className="wf-num">{money(m.result)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </section>
  );
}

function Chevron({ dir }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d={dir === 'left' ? 'M10 3.5 5.5 8 10 12.5' : 'M6 3.5 10.5 8 6 12.5'}
        fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}
