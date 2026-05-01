import React from 'react';
import { R$ } from '../../../core/utils/format';

export default function MemberSummaryWidget({ memberData, monthLabel }) {
  return (
    <div className="card">
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, letterSpacing: '-0.2px' }}>Resumo por Membro — {monthLabel}</h3>
      {memberData.map(m => (
        <div key={m.id} className="flex aic jcb" style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
          <div className="flex aic gap3" style={{ gap: 9 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: m.color + '22', border: `2px solid ${m.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{m.emoji}</div>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="tgreen txxs">{R$(m.income)} ↑</div>
            <div className="tred txxs">{R$(m.expenses)} ↓</div>
          </div>
        </div>
      ))}
    </div>
  );
}
