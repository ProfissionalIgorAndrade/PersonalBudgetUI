import React from 'react';
import { R$, fdate } from '../../../core/utils/format';

export default function RecentWidget({ recent, categories, onViewAll }) {
  return (
    <div className="card">
      <div className="flex jcb aic" style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700 }}>Últimos Lançamentos</h3>
        <button className="btn-icon tsm" onClick={onViewAll}>Ver todos →</button>
      </div>
      {recent.length === 0
        ? <p className="tmuted tsm">Nenhum lançamento</p>
        : recent.map(t => {
            const cat = categories.find(c => c.id === t.categoryId);
            return (
              <div key={t.id} className="flex jcb aic" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="flex aic gap3" style={{ gap: 9 }}>
                  <span style={{ fontSize: 18 }}>{cat?.icon || '📦'}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{t.description}</div>
                    <div className="tmuted txxs">{fdate(t.date)}</div>
                  </div>
                </div>
                <span style={{ fontWeight: 700, fontSize: 13, color: t.type === 'income' ? 'var(--green)' : 'var(--red)', fontFamily: 'Syne' }}>
                  {t.type === 'income' ? '+' : '-'}{R$(t.amount)}
                </span>
              </div>
            );
          })}
    </div>
  );
}
