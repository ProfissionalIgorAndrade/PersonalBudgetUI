import React, { useState, useMemo } from 'react';
import { R$ } from '../../../../core/utils/format';
import { categoryShare } from '../../logic/catalog';
import { pct } from '../../logic/score';
import { SHARE_TOP_N } from '../../logic/targets';
import { HlCard, HlToggle, HlEmpty } from '../HlParts';
import { HcTable, HcStackBar } from './HcParts';

/** Participação por categoria: barra empilhada única com as maiores e "Outras". */
export default function HcShare({ transactions, categories, month }) {
  const [mode, setMode] = useState('chart');
  const { total, items } = useMemo(() => categoryShare(transactions, categories, month), [transactions, categories, month]);

  const rows = items.map(c => ({
    key: c.id || c.name, icon: c.icon, label: c.name, value: c.value, isOther: c.isOther,
    valueText: `${R$(c.value)} · ${pct(c.share)}`,
    detail: `${c.name}: ${R$(c.value)}, ${pct(c.share)} das despesas do mês`,
  }));

  return (
    <HlCard id="share" title="Participação por categoria" subtitle={`As ${SHARE_TOP_N} maiores categorias de despesa; o resto soma em "Outras".`}
      actions={<HlToggle value={mode} onChange={setMode} label="Participação: exibição" />}>
      {total <= 0 ? <HlEmpty>Sem despesas neste mês.</HlEmpty> : mode === 'chart' ? (
        <HcStackBar items={rows} ariaLabel="Participação de cada categoria na despesa do mês" />
      ) : (
        <HcTable rowKey={r => r.key} rows={items} columns={[
          { label: 'Categoria', render: r => r.name },
          { label: 'Valor', render: r => R$(r.value) },
          { label: 'Participação', render: r => pct(r.share) },
        ]} footer={['Total', R$(total), '100%']} />
      )}
    </HlCard>
  );
}
