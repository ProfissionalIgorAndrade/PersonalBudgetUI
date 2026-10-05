import React, { useMemo } from 'react';
import { R$, fdate } from '../../../../core/utils/format';
import { savingsMovements, savingsGrowth } from '../../../savings/savingsHistory';
import { savingsGoals } from '../../logic/metrics';
import { pct } from '../../logic/score';
import { HlCard, HlEmpty, signedPct } from '../HlParts';

/** Caixinhas e metas em detalhe: saldo, meta, quanto falta, crescimento e últimos movimentos. */
export default function HcBoxes({ accounts, savingsTransactions, today }) {
  const boxes = useMemo(() => (accounts || []).filter(a => a?.kind === 'savings'), [accounts]);
  const goals = useMemo(() => savingsGoals(accounts), [accounts]);
  const goalById = Object.fromEntries(goals.map(g => [g.id, g]));
  const ids = boxes.map(b => b.id);
  const moves = useMemo(() => savingsMovements(savingsTransactions || [], ids).slice(0, 5), [savingsTransactions, ids.join('|')]);
  const growth = useMemo(() => savingsGrowth(savingsTransactions || [], boxes, 3, today || new Date()), [savingsTransactions, boxes, today]);
  const total = boxes.reduce((s, b) => s + Math.max(Number(b.balance) || 0, 0), 0);

  return (
    <HlCard id="boxes" title="Caixinhas e metas" subtitle="Saldo e meta de cada caixinha, o crescimento em 3 meses e os últimos movimentos.">
      {boxes.length === 0 ? <HlEmpty>Nenhuma caixinha criada.</HlEmpty> : (
        <div className="hl-future">
          <div className="hl-future-block">
            <p className="hl-note">
              Guardado: <strong>{R$(total)}</strong> · últimos 3 meses: <strong>{growth.amount >= 0 ? '+' : '−'}{R$(Math.abs(growth.amount))}</strong>
              {growth.percent !== null && <> ({signedPct(growth.percent / 100)})</>}
            </p>
            <ul className="hl-goals">
              {boxes.map(b => {
                const g = goalById[b.id];
                const balance = Number(b.balance) || 0;
                return (
                  <li key={b.id} className="hl-goal" tabIndex={0}
                    aria-label={g ? `${b.name}: ${R$(balance)} de ${R$(g.goal)}, ${pct(g.pct / 100)}` : `${b.name}: ${R$(balance)}, sem meta`}>
                    <div className="hl-goal-head">
                      <span>{b.name}</span>
                      <strong>{R$(balance)}{g && <span className="hl-goal-of"> de {R$(g.goal)}</span>}</strong>
                    </div>
                    {g ? (
                      <>
                        <div className="hl-meter" role="meter" aria-label={`Meta ${b.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(g.pct)}>
                          <span className="hl-meter-fill" style={{ width: `${Math.max(g.pct, 2)}%` }} />
                        </div>
                        <span className="hl-goal-note">
                          {g.remaining > 0 ? `${pct(g.pct / 100)} da meta — faltam ${R$(g.remaining)}` : 'Meta atingida'}
                        </span>
                      </>
                    ) : <span className="hl-goal-note">Sem meta definida.</span>}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="hl-future-block">
            <h3 className="hl-h3">Últimos movimentos</h3>
            {moves.length === 0 ? <HlEmpty>Nenhum movimento registrado.</HlEmpty> : (
              <ol className="hl-top-tx">
                {moves.map(m => {
                  const out = m.savingsDirection === 'out';
                  return (
                    <li key={m.id}>
                      <span className="hl-top-tx-desc">
                        {out ? '↓ Resgate' : '↑ Depósito'}{m.description ? ` · ${m.description}` : ''}
                        <span className="hl-top-tx-date">{fdate(m.date)}</span>
                      </span>
                      <strong>{out ? '−' : '+'}{R$(Number(m.amount) || 0)}</strong>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      )}
    </HlCard>
  );
}
