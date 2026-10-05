import React, { useState, useMemo } from 'react';
import { R$ } from '../../../../core/utils/format';
import { biggestIncreases } from '../../logic/catalog';
import { BASELINE_MONTHS } from '../../logic/targets';
import { HlCard, HlToggle, HlEmpty, HlRankBars, signedPct } from '../HlParts';
import { HcTable } from './HcParts';

/** Maiores aumentos: categorias que mais subiram em R$ contra a média dos 3 meses anteriores. */
export default function HcIncreases({ transactions, categories, month }) {
  const [mode, setMode] = useState('chart');
  const items = useMemo(() => biggestIncreases(transactions, categories, month), [transactions, categories, month]);

  const rows = items.map((c, i) => ({
    key: c.id || c.name, label: c.name, icon: c.icon, value: c.increase,
    valueText: `+${R$(c.increase)} (${signedPct(c.increasePct)})`,
    detail: `${c.name}: ${R$(c.value)} no mês contra média de ${R$(c.average)}, aumento de ${R$(c.increase)}`,
    tone: i === 0 ? 'accent' : 'muted',
  }));

  return (
    <HlCard id="increases" title="Maiores aumentos vs média"
      subtitle={`Categorias que mais subiram contra a média dos ${BASELINE_MONTHS} meses anteriores. Categoria sem gasto antes não entra.`}
      actions={<HlToggle value={mode} onChange={setMode} label="Maiores aumentos: exibição" />}>
      {items.length === 0 ? <HlEmpty>Nenhuma categoria acima da média dos {BASELINE_MONTHS} meses anteriores.</HlEmpty> : mode === 'chart' ? (
        <HlRankBars rows={rows} ariaLabel="Aumento por categoria contra a média" />
      ) : (
        <HcTable rowKey={r => r.id || r.name} rows={items} columns={[
          { label: 'Categoria', render: r => r.name },
          { label: 'No mês', render: r => R$(r.value) },
          { label: 'Média', render: r => R$(r.average) },
          { label: 'Aumento', render: r => `+${R$(r.increase)}` },
          { label: 'Variação', render: r => signedPct(r.increasePct) },
        ]} />
      )}
    </HlCard>
  );
}
