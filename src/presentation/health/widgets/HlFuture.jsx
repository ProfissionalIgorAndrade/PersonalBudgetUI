import React, { useState } from 'react';
import { R$, monthLabel } from '../../../core/utils/format';
import { FUTURE_MONTHS } from '../logic/targets';
import { pct } from '../logic/score';
import { HlCard, HlToggle, HlEmpty } from './HlParts';

/**
 * Plano de futuro: compromissos já lançados (fixos + parcelas) contra a renda
 * média, o mês em que a folga aumenta e o avanço das metas das caixinhas.
 *
 * É renda média menos o que já está lançado, não uma previsão de renda.
 */
export default function HlFuture({ plan, goals }) {
  const [mode, setMode] = useState('chart');
  const { income, months, relief } = plan;
  const scale = Math.max(income || 0, ...months.map(m => m.total), 1);
  const hasCommitments = months.some(m => m.total > 0);

  return (
    <HlCard id="future" title="Plano de futuro"
      subtitle={`Compromissos já lançados nos próximos ${FUTURE_MONTHS} meses e metas das caixinhas.`}
      actions={<HlToggle value={mode} onChange={setMode} label="Plano de futuro: exibição" />}>
      <div className="hl-future">
        <div className="hl-future-block">
          <h3 className="hl-h3">Compromissos x renda média</h3>
          {income === null
            ? <HlEmpty>Sem renda nos últimos 3 meses: não dá para calcular a folga. Os compromissos aparecem abaixo.</HlEmpty>
            : <p className="hl-note">Renda média: <strong>{R$(income)}</strong> por mês.</p>}

          {!hasCommitments ? (
            <HlEmpty>Nenhum fixo ou parcela lançado para os próximos meses.</HlEmpty>
          ) : mode === 'chart' ? (
            <>
              <ul className="hl-commit" aria-label="Compromissos por mês">
                {months.map(m => {
                  const detail = `${monthLabel(m.key)}: fixos ${R$(m.fixed)}, parcelas ${R$(m.installment)}`
                    + (m.free === null ? '' : `, folga ${R$(m.free)}`);
                  return (
                    <li key={m.key} className="hl-commit-row" tabIndex={0} title={detail} aria-label={detail}>
                      <span className="hl-commit-month">{monthLabel(m.key)}</span>
                      <span className="hl-commit-track" aria-hidden="true">
                        <span className="hl-stack-seg hl-seg-fixed" style={{ width: `${(m.fixed / scale) * 100}%` }} />
                        <span className="hl-stack-seg hl-seg-installment" style={{ width: `${(m.installment / scale) * 100}%` }} />
                        {income !== null && <span className="hl-commit-income" style={{ left: `${(income / scale) * 100}%` }} />}
                      </span>
                      <span className="hl-commit-value">{R$(m.total)}</span>
                    </li>
                  );
                })}
              </ul>
              <ul className="hl-legend hl-legend-inline">
                <li><span className="hl-swatch hl-seg-fixed" aria-hidden="true" /><span>Fixos</span></li>
                <li><span className="hl-swatch hl-seg-installment" aria-hidden="true" /><span>Parcelas</span></li>
                {income !== null && <li><span className="hl-swatch hl-swatch-line" aria-hidden="true" /><span>Renda média</span></li>}
              </ul>
            </>
          ) : (
            <div className="hl-table-wrap">
              <table className="hl-table">
                <thead>
                  <tr><th scope="col">Mês</th><th scope="col">Fixos</th><th scope="col">Parcelas</th><th scope="col">Total</th><th scope="col">Folga</th></tr>
                </thead>
                <tbody>
                  {months.map(m => (
                    <tr key={m.key}>
                      <th scope="row">{monthLabel(m.key)}</th>
                      <td>{R$(m.fixed)}</td><td>{R$(m.installment)}</td><td>{R$(m.total)}</td>
                      <td>{m.free === null ? '—' : R$(m.free)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {hasCommitments && (relief
            ? <p className="hl-callout">
                <span aria-hidden="true">↗ </span>
                A folga aumenta em <strong>{monthLabel(relief.key)}</strong>: {R$(relief.freed)} a menos de compromissos por mês.
              </p>
            : <p className="hl-callout hl-callout-neutral">
                Nenhum compromisso termina nos próximos {FUTURE_MONTHS} meses, a folga não muda no período.
              </p>)}
        </div>

        <div className="hl-future-block">
          <h3 className="hl-h3">Metas das caixinhas</h3>
          {goals.length === 0 ? (
            <HlEmpty>Nenhuma caixinha com meta definida.</HlEmpty>
          ) : (
            <ul className="hl-goals">
              {goals.map(g => (
                <li key={g.id} className="hl-goal" tabIndex={0}
                  aria-label={`${g.name}: ${R$(g.balance)} de ${R$(g.goal)}, ${pct(g.pct / 100)}`}>
                  <div className="hl-goal-head">
                    <span>{g.name}</span>
                    <strong>{R$(g.balance)} <span className="hl-goal-of">de {R$(g.goal)}</span></strong>
                  </div>
                  <div className="hl-meter" role="meter" aria-label={`Meta ${g.name}`}
                    aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(g.pct)}>
                    <span className="hl-meter-fill" style={{ width: `${Math.max(g.pct, 2)}%` }} />
                  </div>
                  <span className="hl-goal-note">
                    {g.remaining > 0 ? `${pct(g.pct / 100)} da meta — faltam ${R$(g.remaining)}` : 'Meta atingida'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </HlCard>
  );
}
