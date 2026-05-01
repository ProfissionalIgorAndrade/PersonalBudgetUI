import React from 'react';
import { R$ } from '../../../core/utils/format';

export default function CategoryExpensesWidget({ categories, byCat, catKeys, totalOut }) {
  return (
    <div className="card">
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, letterSpacing: '-0.2px' }}>Despesas por Categoria</h3>
      {catKeys.length === 0
        ? <p className="tmuted tsm" style={{ textAlign: 'center', padding: '12px 0' }}>Sem despesas este mês</p>
        : catKeys.slice(0, 7).map(k => {
            const cat = categories.find(c => c.id === k);
            const pct = totalOut > 0 ? (byCat[k] / totalOut * 100).toFixed(0) : 0;
            return (
              <div key={k} style={{ marginBottom: 10 }}>
                <div className="flex jcb aic mb2">
                  <span style={{ fontSize: 12 }}>{cat?.icon} {cat?.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{R$(byCat[k])} <span className="tmuted txxs">({pct}%)</span></span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: pct + '%', background: cat?.color || 'var(--red)' }} />
                </div>
              </div>
            );
          })}
    </div>
  );
}
