import React, { useMemo } from 'react';
import { R$, monthLabel } from '../../../../core/utils/format';
import { activeInstallments } from '../../logic/catalog';
import { HlCard, HlEmpty } from '../HlParts';
import { HcTable } from './HcParts';

/**
 * Parcelamentos ativos. "Parcela x de y" vem do sufixo da descrição (só
 * exibição); meses e valor restantes saem das linhas futuras já lançadas.
 */
export default function HcInstallments({ transactions, month }) {
  const { items, monthly, remaining } = useMemo(() => activeInstallments(transactions, month), [transactions, month]);

  return (
    <HlCard id="installments" title="Parcelamentos ativos" subtitle="Parcelas em andamento e o que ainda falta pagar, a partir do mês selecionado.">
      {items.length === 0 ? <HlEmpty>Nenhum parcelamento ativo neste mês.</HlEmpty> : (
        <>
          <p className="hl-note">
            Parcelas no mês: <strong>{R$(monthly)}</strong> · ainda a pagar depois dele: <strong>{R$(remaining)}</strong>
          </p>
          <HcTable rowKey={r => r.key} rows={items} columns={[
            { label: 'Compra', render: r => r.name },
            { label: 'Parcela', render: r => (r.current !== null && r.total !== null ? `${r.current} de ${r.total}` : '—') },
            { label: 'Valor', render: r => (r.inMonth ? R$(r.installmentAmount) : `${R$(r.installmentAmount)} (ainda não começou)`) },
            { label: 'Faltam', render: r => `${r.remainingMonths} ${r.remainingMonths === 1 ? 'mês' : 'meses'}` },
            { label: 'Restante', render: r => R$(r.remainingAmount) },
            { label: 'Termina', render: r => monthLabel(r.lastMonth) },
          ]} />
        </>
      )}
    </HlCard>
  );
}
