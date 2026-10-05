import React, { useMemo } from 'react';
import { R$, fdate } from '../../../../core/utils/format';
import { latestTransactions, baseDescription } from '../../logic/catalog';
import { HlCard, HlEmpty } from '../HlParts';

/** Últimos lançamentos do mês, mais recentes primeiro. */
export default function HcLatest({ transactions, categories, month }) {
  const rows = useMemo(() => latestTransactions(transactions, month, 10), [transactions, month]);
  const cat = (id) => (categories || []).find(c => c.id === id);

  return (
    <HlCard id="latest" title="Últimos lançamentos" subtitle="Os 10 lançamentos mais recentes do mês selecionado.">
      {rows.length === 0 ? <HlEmpty>Sem lançamentos neste mês.</HlEmpty> : (
        <ol className="hl-top-tx">
          {rows.map(t => {
            const income = t.type === 'income';
            const c = cat(t.categoryId);
            return (
              <li key={t.id}>
                <span className="hl-top-tx-desc">
                  {baseDescription(t.description) || 'Sem descrição'}
                  <span className="hl-top-tx-date">{fdate(t.date)}{c ? ` · ${c.icon || ''} ${c.name}` : ''}</span>
                </span>
                <strong>{income ? '↑ +' : '↓ −'}{R$(Number(t.amount) || 0)}</strong>
              </li>
            );
          })}
        </ol>
      )}
    </HlCard>
  );
}
