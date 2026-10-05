import React, { useState, useMemo } from 'react';
import { reviewProgress } from '../../logic/catalog';
import { pct } from '../../logic/score';
import { HlCard, HlToggle, HlEmpty } from '../HlParts';
import { HcTable } from './HcParts';

/** Progresso de revisão: % dos lançamentos do mês marcados como revisados, por cartão ou conta. */
export default function HcReview({ transactions, accounts, cards, month }) {
  const [mode, setMode] = useState('chart');
  const p = useMemo(() => reviewProgress(transactions, accounts, cards, month), [transactions, accounts, cards, month]);
  const bar = (value, label) => (
    <div className="hl-meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)} aria-valuetext={pct(value)}>
      <span className="hl-meter-fill" style={{ width: `${Math.max(value * 100, 2)}%` }} />
    </div>
  );

  return (
    <HlCard id="review" title="Progresso de revisão" subtitle="Quanto dos lançamentos do mês já foi revisado. Pior grupo primeiro."
      actions={p.total > 0 ? <HlToggle value={mode} onChange={setMode} label="Revisão: exibição" /> : null}>
      {p.total === 0 ? <HlEmpty>Sem lançamentos neste mês.</HlEmpty> : (
        <>
          <p className="hl-note"><strong>{pct(p.pct)}</strong> revisado — {p.reviewed} de {p.total} lançamentos.</p>
          {bar(p.pct, 'Progresso geral de revisão')}
          {mode === 'chart' ? (
            <ul className="hl-goals hl-review-groups">
              {p.groups.map(g => (
                <li key={g.key} className="hl-goal" tabIndex={0} aria-label={`${g.label}: ${g.reviewed} de ${g.total} revisados, ${pct(g.pct)}`}>
                  <div className="hl-goal-head">
                    <span><span aria-hidden="true">{g.icon} </span>{g.label}</span>
                    <strong>{pct(g.pct)} <span className="hl-goal-of">{g.reviewed} de {g.total}</span></strong>
                  </div>
                  {bar(g.pct, `Revisão ${g.label}`)}
                </li>
              ))}
            </ul>
          ) : (
            <HcTable rowKey={g => g.key} rows={p.groups} columns={[
              { label: 'Conta ou cartão', render: g => g.label },
              { label: 'Revisados', render: g => `${g.reviewed} de ${g.total}` },
              { label: 'Progresso', render: g => pct(g.pct) },
            ]} footer={['Total', `${p.reviewed} de ${p.total}`, pct(p.pct)]} />
          )}
        </>
      )}
    </HlCard>
  );
}
