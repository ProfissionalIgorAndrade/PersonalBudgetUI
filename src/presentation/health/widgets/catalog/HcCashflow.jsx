import React, { useState, useMemo } from 'react';
import { R$, monthLabel } from '../../../../core/utils/format';
import { monthSeries } from '../../logic/metrics';
import { HlCard, HlToggle, HlEmpty } from '../HlParts';
import { HcTable, HcLegend, HcGroupedBars } from './HcParts';

/** Fluxo de caixa: receita contra despesa nos 6 meses terminando no mês selecionado. */
export default function HcCashflow({ transactions, month }) {
  const [mode, setMode] = useState('chart');
  const series = useMemo(() => monthSeries(transactions, month, 6), [transactions, month]);
  const hasAny = series.some(s => s.income > 0 || s.expense > 0);

  const points = series.map(s => ({ key: s.key, label: monthLabel(s.key).split('/')[0], a: s.income, b: s.expense }));

  return (
    <HlCard id="cashflow" title="Fluxo de caixa (6 meses)" subtitle="Receita e despesa mês a mês, até o mês selecionado."
      actions={<HlToggle value={mode} onChange={setMode} label="Fluxo de caixa: exibição" />}>
      {!hasAny ? <HlEmpty>Sem lançamentos nos últimos 6 meses.</HlEmpty> : mode === 'chart' ? (
        <>
          <HcLegend items={[{ key: 'a', cls: 'hl-sw-a', label: 'Receitas' }, { key: 'b', cls: 'hl-sw-b', label: 'Despesas' }]} />
          <HcGroupedBars points={points} labelA="Receitas" labelB="Despesas" ariaLabel="Receitas e despesas por mês, últimos 6 meses" />
        </>
      ) : (
        <HcTable rowKey={r => r.key} rows={series} columns={[
          { label: 'Mês', render: r => monthLabel(r.key) },
          { label: 'Receitas', render: r => R$(r.income) },
          { label: 'Despesas', render: r => R$(r.expense) },
          { label: 'Sobra', render: r => R$(r.result) },
        ]} />
      )}
    </HlCard>
  );
}
