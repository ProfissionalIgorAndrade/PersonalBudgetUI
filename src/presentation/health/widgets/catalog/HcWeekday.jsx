import React, { useState, useMemo } from 'react';
import { R$ } from '../../../../core/utils/format';
import { weekdayPattern } from '../../logic/catalog';
import { pct } from '../../logic/score';
import { HlCard, HlToggle, HlEmpty, HlEvoChart, compact } from '../HlParts';
import { HcTable } from './HcParts';

/** Padrão por dia da semana: despesa do mês somada por dia da semana da data do lançamento. */
export default function HcWeekday({ transactions, month }) {
  const [mode, setMode] = useState('chart');
  const pattern = useMemo(() => weekdayPattern(transactions, month), [transactions, month]);
  const points = pattern.items.map(i => ({ key: i.short, label: i.short, value: i.value }));
  const top = pattern.items.reduce((a, b) => (b.value > a.value ? b : a), pattern.items[0]);

  return (
    <HlCard id="weekday" title="Padrão por dia da semana" subtitle="Em que dias da semana a despesa do mês se concentra."
      actions={<HlToggle value={mode} onChange={setMode} label="Dia da semana: exibição" />}>
      {pattern.total <= 0 ? <HlEmpty>Sem despesas neste mês.</HlEmpty> : mode === 'chart' ? (
        <>
          <p className="hl-note">Maior concentração: <strong>{top.name}</strong>, {R$(top.value)} ({pct(top.value / pattern.total)} do mês).</p>
          <HlEvoChart kind="columns" title="Despesa por dia da semana (R$)" points={points} format={R$} axisFormat={compact}
            ariaLabel="Despesa do mês por dia da semana" />
        </>
      ) : (
        <HcTable rowKey={r => r.index} rows={pattern.items} columns={[
          { label: 'Dia', render: r => r.name },
          { label: 'Total', render: r => R$(r.value) },
          { label: 'Lançamentos', render: r => r.count },
          { label: 'Participação', render: r => pct(r.value / pattern.total) },
        ]} />
      )}
    </HlCard>
  );
}
