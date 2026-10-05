import React, { useState } from 'react';
import { R$ } from '../../../core/utils/format';
import { CATEGORY_EXCESS_THRESHOLD, BASELINE_MONTHS } from '../logic/targets';
import { HlCard, HlToggle, HlRankBars, HlEmpty, signedPct } from './HlParts';

/** Onde economizar: categorias acima da média dos meses anteriores, ou as maiores variáveis. */
export default function HlSavings({ opportunities }) {
  const [mode, setMode] = useState('chart');
  const { mode: kind, items } = opportunities;
  const isExcess = kind === 'excess';
  const limit = Math.round(CATEGORY_EXCESS_THRESHOLD * 100);

  const subtitle = isExcess
    ? `Categorias ${limit}% ou mais acima da média dos ${BASELINE_MONTHS} meses anteriores.`
    : `Nenhuma categoria passou ${limit}% da média dos ${BASELINE_MONTHS} meses anteriores. Estas são as maiores despesas variáveis do mês.`;

  const rows = items.map(c => ({
    key: c.id || c.name,
    label: c.name,
    icon: c.icon,
    value: isExcess ? c.excess : c.value,
    valueText: isExcess
      ? `+${R$(c.excess)}${c.excessPct !== null ? ` (${signedPct(c.excessPct)})` : ''}`
      : R$(c.value),
    detail: isExcess
      ? `${c.name}: ${R$(c.value)} no mês contra média de ${R$(c.average)}, excesso de ${R$(c.excess)}`
      : `${c.name}: ${R$(c.value)} no mês`,
    tone: isExcess ? 'accent' : 'muted',
  }));

  return (
    <HlCard id="savings" title="Onde economizar" subtitle={subtitle}
      actions={<HlToggle value={mode} onChange={setMode} label="Onde economizar: exibição" />}>
      {items.length === 0 ? <HlEmpty>Sem despesas variáveis neste mês.</HlEmpty> : mode === 'chart' ? (
        <HlRankBars rows={rows} ariaLabel={isExcess ? 'Excesso por categoria' : 'Maiores despesas variáveis'} />
      ) : (
        <div className="hl-table-wrap">
          <table className="hl-table">
            <thead>
              <tr>
                <th scope="col">Categoria</th><th scope="col">No mês</th>
                {isExcess && <><th scope="col">Média</th><th scope="col">Excesso</th></>}
              </tr>
            </thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id || c.name}>
                  <th scope="row">{c.name}</th>
                  <td>{R$(c.value)}</td>
                  {isExcess && <><td>{R$(c.average)}</td><td>{R$(c.excess)}{c.excessPct !== null ? ` (${signedPct(c.excessPct)})` : ''}</td></>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </HlCard>
  );
}
