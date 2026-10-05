import React, { useState, useMemo } from 'react';
import { R$, monthLabel } from '../../../../core/utils/format';
import { categoryTrend } from '../../logic/catalog';
import { TREND_WINDOWS } from '../../logic/targets';
import { HlCard, HlToggle, HlEmpty, HlSpark, signedPct } from '../HlParts';
import { HcTable, HcSegment } from './HcParts';

const OPTIONS = TREND_WINDOWS.map(n => ({ id: n, label: `${n} meses` }));

/** Tendência por categoria: despesa mensal das maiores categorias em 3, 6 ou 12 meses. */
export default function HcTrend({ transactions, categories, month }) {
  const [mode, setMode] = useState('chart');
  const [months, setMonths] = useState(6);
  const { keys, items } = useMemo(() => categoryTrend(transactions, categories, month, months), [transactions, categories, month, months]);

  return (
    <HlCard id="trend" title="Tendência por categoria" subtitle={`Despesa mensal das maiores categorias nos últimos ${months} meses.`}
      actions={(
        <div className="hl-actions">
          <HcSegment options={OPTIONS} value={months} onChange={setMonths} label="Janela da tendência" />
          <HlToggle value={mode} onChange={setMode} label="Tendência: exibição" />
        </div>
      )}>
      {items.length === 0 ? <HlEmpty>Sem despesas nos últimos {months} meses.</HlEmpty> : mode === 'chart' ? (
        <ul className="hl-trend">
          {items.map(c => (
            <li key={c.id || c.name} className="hl-trend-row" tabIndex={0}
              aria-label={`${c.name}: ${R$(c.last)} no mês, média de ${R$(c.average)} em ${months} meses`}>
              <span className="hl-trend-name"><span aria-hidden="true">{c.icon} </span>{c.name}</span>
              <HlSpark points={c.points} ariaLabel={`${c.name}: ${c.points.map(p => R$(p.value)).join(', ')}`} />
              <span className="hl-trend-values">
                <strong>{R$(c.last)}</strong>
                <span>média {R$(c.average)}{c.change !== null ? ` · ${signedPct(c.change)}` : ''}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <HcTable rowKey={r => r.id || r.name} rows={items} columns={[
          { label: 'Categoria', render: r => r.name },
          ...keys.map((k, i) => ({ label: monthLabel(k), render: r => R$(r.points[i].value) })),
          { label: 'Média', render: r => R$(r.average) },
        ]} />
      )}
    </HlCard>
  );
}
