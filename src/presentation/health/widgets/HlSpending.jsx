import React, { useState } from 'react';
import { R$, fdate } from '../../../core/utils/format';
import { parseInstallment } from '../logic/metrics';
import { pct } from '../logic/score';
import { HlCard, HlToggle, HlRankBars, HlEmpty } from './HlParts';

const KINDS = [
  { id: 'fixed',       label: 'Fixo',     cls: 'hl-seg-fixed' },
  { id: 'variable',    label: 'Variável', cls: 'hl-seg-variable' },
  { id: 'installment', label: 'Parcelado', cls: 'hl-seg-installment' },
];

/** Para onde vai o dinheiro: categorias, fixo/variável/parcelado e maiores lançamentos. */
export default function HlSpending({ categories, totals, expenses }) {
  const [mode, setMode] = useState('chart');
  const total = totals.expense;

  const rows = categories.map((c, i) => ({
    key: c.id || c.name,
    label: c.name,
    icon: c.icon,
    value: c.value,
    valueText: `${R$(c.value)} · ${pct(c.share)}`,
    detail: `${c.name}: ${R$(c.value)}, ${pct(c.share)} das despesas do mês`,
    tone: i === 0 ? 'accent' : 'muted',
  }));

  return (
    <HlCard id="spending" title="Para onde vai o dinheiro" subtitle="Despesas do mês: maiores categorias, natureza do gasto e maiores lançamentos."
      actions={<HlToggle value={mode} onChange={setMode} label="Para onde vai o dinheiro: exibição" />}>
      {total <= 0 ? <HlEmpty>Sem despesas neste mês.</HlEmpty> : (
        <div className="hl-spending">
          <div className="hl-spending-block">
            <h3 className="hl-h3">Maiores categorias</h3>
            {mode === 'chart'
              ? <HlRankBars rows={rows} ariaLabel="Maiores categorias de despesa" />
              : (
                <div className="hl-table-wrap">
                  <table className="hl-table">
                    <thead><tr><th scope="col">Categoria</th><th scope="col">Valor</th><th scope="col">Participação</th></tr></thead>
                    <tbody>
                      {categories.map(c => (
                        <tr key={c.id || c.name}><th scope="row">{c.name}</th><td>{R$(c.value)}</td><td>{pct(c.share)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>

          <div className="hl-spending-block">
            <h3 className="hl-h3">Fixo, variável e parcelado</h3>
            {mode === 'chart' && (
              <div className="hl-stack" role="img"
                aria-label={KINDS.map(k => `${k.label} ${R$(totals[k.id])}`).join(', ')}>
                {KINDS.filter(k => totals[k.id] > 0).map(k => (
                  <span key={k.id} className={`hl-stack-seg ${k.cls}`} style={{ flexGrow: totals[k.id] }}
                    tabIndex={0} title={`${k.label}: ${R$(totals[k.id])} (${pct(totals[k.id] / total)})`}
                    aria-label={`${k.label}: ${R$(totals[k.id])} (${pct(totals[k.id] / total)})`} />
                ))}
              </div>
            )}
            {mode === 'chart' ? (
              <ul className="hl-legend">
                {KINDS.map(k => (
                  <li key={k.id}>
                    <span className={`hl-swatch ${k.cls}`} aria-hidden="true" />
                    <span>{k.label}</span>
                    <strong>{R$(totals[k.id])} · {pct(totals[k.id] / total)}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="hl-table-wrap">
                <table className="hl-table">
                  <thead><tr><th scope="col">Natureza</th><th scope="col">Valor</th><th scope="col">Participação</th></tr></thead>
                  <tbody>
                    {KINDS.map(k => (
                      <tr key={k.id}><th scope="row">{k.label}</th><td>{R$(totals[k.id])}</td><td>{pct(totals[k.id] / total)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="hl-spending-block">
            <h3 className="hl-h3">Maiores lançamentos</h3>
            <ol className="hl-top-tx">
              {expenses.map(t => {
                const inst = parseInstallment(t.description);
                return (
                  <li key={t.id}>
                    <span className="hl-top-tx-desc">
                      {(t.description || '').replace(/\s*\(\d+\s*\/\s*\d+\)\s*$/, '') || 'Sem descrição'}
                      {inst && <span className="hl-top-tx-tag"> parcela {inst.current} de {inst.total}</span>}
                      <span className="hl-top-tx-date">{fdate(t.date)}</span>
                    </span>
                    <strong>{R$(Number(t.amount) || 0)}</strong>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
    </HlCard>
  );
}
