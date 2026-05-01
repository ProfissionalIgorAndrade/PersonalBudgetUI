import React from 'react';
import { R$ } from '../../../core/utils/format';

export default function IncomePerPersonWidget({ memberData, totalIn }) {
  const filtered = [...memberData].filter(m => m.income > 0).sort((a, b) => b.income - a.income);
  return (
    <div className="card">
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, letterSpacing: '-0.2px' }}>Receitas por Pessoa</h3>
      {filtered.length === 0
        ? <p className="tmuted tsm" style={{ textAlign: 'center', padding: '12px 0' }}>Sem receitas este mês</p>
        : filtered.map(m => {
            const pct = totalIn > 0 ? (m.income / totalIn * 100).toFixed(0) : 0;
            return (
              <div key={m.id} style={{ marginBottom: 11 }}>
                <div className="flex jcb aic mb2">
                  <span style={{ fontSize: 12 }}>{m.emoji} {m.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>{R$(m.income)} <span className="tmuted txxs">({pct}%)</span></span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: pct + '%', background: m.color || 'var(--green)' }} />
                </div>
              </div>
            );
          })}
    </div>
  );
}
