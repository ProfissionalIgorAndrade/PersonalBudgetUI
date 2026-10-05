import React, { useState } from 'react';
import { R$, monthLabel } from '../../../core/utils/format';
import { SAVINGS_RATE_TARGET } from '../logic/targets';
import { pct } from '../logic/score';
import { HlCard, HlToggle, HlEvoChart, HlEmpty, compact } from './HlParts';

/** Evolução de 6 meses: sobra e taxa de poupança em dois gráficos pequenos, cada um com seu eixo. */
export default function HlEvolution({ series }) {
  const [mode, setMode] = useState('chart');
  const hasAny = series.some(s => s.income > 0 || s.expense > 0);

  const result = series.map(s => ({ key: s.key, label: monthLabel(s.key).split('/')[0], value: s.result }));
  const rate = series.map(s => ({ key: s.key, label: monthLabel(s.key).split('/')[0], value: s.savingsRate }));

  return (
    <HlCard id="evolution" title="Evolução (6 meses)" subtitle="Sobra e taxa de poupança mês a mês."
      actions={<HlToggle value={mode} onChange={setMode} label="Evolução: exibição" />}>
      {!hasAny ? <HlEmpty>Sem lançamentos nos últimos 6 meses.</HlEmpty> : mode === 'chart' ? (
        <div className="hl-evo-pair">
          <HlEvoChart kind="columns" title="Sobra do mês (R$)" points={result} format={R$}
            axisFormat={compact} ariaLabel="Sobra por mês, últimos 6 meses" />
          <HlEvoChart kind="line" title="Taxa de poupança" points={rate} format={(v) => pct(v, 1)}
            axisFormat={(v) => `${Math.round(v * 100)}%`}
            reference={{ value: SAVINGS_RATE_TARGET, label: `meta ${pct(SAVINGS_RATE_TARGET)}` }}
            ariaLabel="Taxa de poupança por mês, últimos 6 meses" />
        </div>
      ) : (
        <div className="hl-table-wrap">
          <table className="hl-table">
            <thead><tr><th scope="col">Mês</th><th scope="col">Sobra</th><th scope="col">Taxa de poupança</th></tr></thead>
            <tbody>
              {series.map(s => (
                <tr key={s.key}>
                  <th scope="row">{monthLabel(s.key)}</th>
                  <td>{R$(s.result)}</td>
                  <td>{s.savingsRate === null ? 'sem receita' : pct(s.savingsRate, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </HlCard>
  );
}
