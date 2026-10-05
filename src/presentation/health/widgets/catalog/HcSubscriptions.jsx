import React, { useMemo } from 'react';
import { R$, fdate } from '../../../../core/utils/format';
import { subscriptions } from '../../logic/catalog';
import { HlCard, HlEmpty } from '../HlParts';

/** Assinaturas: despesas fixas em categorias com "assinatura" no nome. */
export default function HcSubscriptions({ transactions, categories, month }) {
  const { hasCategory, items, total, yearly } = useMemo(() => subscriptions(transactions, categories, month), [transactions, categories, month]);

  return (
    <HlCard id="subscriptions" title="Assinaturas" subtitle='Despesas fixas das categorias cujo nome contém "assinatura".'>
      {!hasCategory ? (
        <HlEmpty>Nenhuma categoria com "Assinaturas" no nome. Crie uma e marque as despesas fixas nela para acompanhar aqui.</HlEmpty>
      ) : items.length === 0 ? (
        <HlEmpty>Nenhuma assinatura fixa neste mês.</HlEmpty>
      ) : (
        <>
          <p className="hl-note">Total no mês: <strong>{R$(total)}</strong> · por ano: <strong>{R$(yearly)}</strong></p>
          <ol className="hl-top-tx">
            {items.map(i => (
              <li key={i.id}>
                <span className="hl-top-tx-desc">{i.name}<span className="hl-top-tx-date">{fdate(i.date)}</span></span>
                <strong>{R$(i.value)}</strong>
              </li>
            ))}
          </ol>
        </>
      )}
    </HlCard>
  );
}
