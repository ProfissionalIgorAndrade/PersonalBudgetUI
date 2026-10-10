import React from 'react';
import { R$ } from '../../../core/utils/format';

function pct(spent, limit) {
  if (!limit) return 0;
  return Math.min((spent / limit) * 100, 100);
}

function barColor(p) {
  if (p >= 100) return 'var(--red)';
  if (p >= 70)  return '#fbbf24';
  return '#4ade80';
}

export default function BudgetWidget({ budgets, categories, setView }) {
  const withLimits = (budgets || []).filter(b => b.limitAmount > 0).slice(0, 5);

  if (withLimits.length === 0) {
    return (
      <div className="card">
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, letterSpacing: '-0.2px' }}>🎯 Orçamentos</h3>
        <p className="tmuted tsm" style={{ textAlign: 'center', padding: '10px 0' }}>
          Nenhum limite definido para este mês
        </p>
        <button
          className="btn btn-secondary"
          style={{ width: '100%', fontSize: 12, marginTop: 8 }}
          onClick={() => setView('budgets')}
        >
          Definir limites →
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex jcb aic" style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.2px' }}>🎯 Orçamentos</h3>
        <button
          className="btn-link"
          style={{ fontSize: 11, color: 'var(--primary)' }}
          onClick={() => setView('budgets')}
        >
          Ver todos →
        </button>
      </div>

      {withLimits.map(b => {
        const cat = (categories || []).find(c => c.id === b.categoryId);
        const p   = pct(b.spentAmount, b.limitAmount);
        return (
          <div key={b.id} style={{ marginBottom: 12 }}>
            <div className="flex jcb aic" style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 12 }}>{cat?.icon} {cat?.name || '—'}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: barColor(p) }}>
                {R$(b.spentAmount)} / {R$(b.limitAmount)}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${p}%`, background: barColor(p) }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
