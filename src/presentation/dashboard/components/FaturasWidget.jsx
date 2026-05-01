import React from 'react';
import { R$ } from '../../../core/utils/format';

export default function FaturasWidget({ faturasData, totalFaturas }) {
  return (
    <div className="card">
      <div className="flex jcb aic" style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700 }}>💳 Faturas do Mês</h3>
        <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne', color: 'var(--red)' }}>{R$(totalFaturas)}</span>
      </div>
      {faturasData.length === 0
        ? <p className="tmuted tsm" style={{ textAlign: 'center', padding: '12px 0' }}>Nenhuma fatura este mês</p>
        : faturasData.map(c => {
            const pct = totalFaturas > 0 ? (c.spent / totalFaturas * 100).toFixed(0) : 0;
            return (
              <div key={c.id} style={{ marginBottom: 10 }}>
                <div className="flex jcb aic mb2">
                  <span style={{ fontSize: 12 }}>{c.name} <span className="tmuted txxs">···· {c.lastDigits || '????'}</span></span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{R$(c.spent)}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: pct + '%', background: c.color || 'var(--primary)' }} />
                </div>
              </div>
            );
          })}
    </div>
  );
}
