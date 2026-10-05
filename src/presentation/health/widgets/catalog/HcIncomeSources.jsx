import React, { useState, useMemo } from 'react';
import { R$ } from '../../../../core/utils/format';
import { incomeSources } from '../../logic/catalog';
import { pct } from '../../logic/score';
import { HlCard, HlToggle, HlEmpty, HlRankBars } from '../HlParts';
import { HcTable } from './HcParts';

/** Fontes de renda: receita do mês por categoria (ou pela descrição, quando não há categoria). */
export default function HcIncomeSources({ transactions, categories, month }) {
  const [mode, setMode] = useState('chart');
  const { total, items } = useMemo(() => incomeSources(transactions, categories, month), [transactions, categories, month]);

  const rows = items.map((s, i) => ({
    key: s.id, label: s.name, icon: s.icon, value: s.value,
    valueText: `${R$(s.value)} · ${pct(s.share)}`,
    detail: `${s.name}: ${R$(s.value)}, ${pct(s.share)} da receita do mês`,
    tone: i === 0 ? 'accent' : 'muted',
  }));

  return (
    <HlCard id="income-sources" title="Fontes de renda" subtitle="De onde vem a receita do mês, por categoria ou, sem categoria, pela descrição."
      actions={<HlToggle value={mode} onChange={setMode} label="Fontes de renda: exibição" />}>
      {total <= 0 ? <HlEmpty>Sem receitas neste mês.</HlEmpty> : mode === 'chart' ? (
        <HlRankBars rows={rows} ariaLabel="Fontes de renda do mês" />
      ) : (
        <HcTable rowKey={r => r.id} rows={items} columns={[
          { label: 'Fonte', render: r => r.name },
          { label: 'Valor', render: r => R$(r.value) },
          { label: 'Participação', render: r => pct(r.share) },
        ]} footer={['Total', R$(total), '100%']} />
      )}
    </HlCard>
  );
}
