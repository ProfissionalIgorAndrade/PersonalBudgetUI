import React, { useMemo } from 'react';
import { R$, fdate } from '../../../../core/utils/format';
import { fixedOfMonth } from '../../logic/catalog';
import { pct } from '../../logic/score';
import { HlCard, HlEmpty } from '../HlParts';

/** Fixos do mês: despesas fixas lançadas no mês, com total e peso na renda. */
export default function HcFixed({ transactions, categories, month }) {
  const { total, items, incomeShare } = useMemo(() => fixedOfMonth(transactions, categories, month), [transactions, categories, month]);

  return (
    <HlCard id="fixed" title="Fixos do mês" subtitle="Despesas fixas lançadas no mês selecionado, maiores primeiro.">
      {items.length === 0 ? <HlEmpty>Nenhuma despesa fixa neste mês.</HlEmpty> : (
        <>
          <p className="hl-note">
            Total: <strong>{R$(total)}</strong>
            {incomeShare !== null ? <> · {pct(incomeShare)} da renda do mês</> : <> · sem renda no mês para comparar</>}
          </p>
          <ol className="hl-top-tx">
            {items.map(i => (
              <li key={i.id}>
                <span className="hl-top-tx-desc">
                  {i.description}
                  <span className="hl-top-tx-date">{fdate(i.date)} · {i.category.icon} {i.category.name}</span>
                </span>
                <strong>{R$(i.value)}</strong>
              </li>
            ))}
          </ol>
        </>
      )}
    </HlCard>
  );
}
