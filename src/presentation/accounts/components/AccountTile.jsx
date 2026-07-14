import React from 'react';
import { R$ } from '../../../core/utils/format';
import { findMember } from '../../../application/mappers/index';

const NUM = { fontFamily: "'Inter', sans-serif", fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1' };

function hexDarken(hex, f) {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * f);
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * f);
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * f);
  const toH = n => Math.min(255, Math.max(0, n)).toString(16).padStart(2, '0');
  return `#${toH(r)}${toH(g)}${toH(b)}`;
}

const getGrad = c => {
  try { return `linear-gradient(135deg, ${hexDarken(c, 0.12)} 0%, ${hexDarken(c, 0.32)} 100%)`; }
  catch { return 'linear-gradient(135deg, #1e293b, #0f172a)'; }
};

export default function AccountTile({ account, balance, members, selected, onSelect, onEdit, onDelete }) {
  const mem = findMember(members, account.memberId);

  return (
    <div style={{ borderRadius: 14, outline: selected ? '2px solid var(--primary)' : '2px solid transparent', outlineOffset: 3, transition: 'outline-color .2s' }}>
      <div
        className="cc-visual cc-clickable"
        style={{ background: getGrad(account.color), padding: '14px 16px', minHeight: 110 }}
        onClick={onSelect}
      >
        {/* Topo: banco + titular */}
        <div>
          <div style={{ fontSize: 10, opacity: .6, marginBottom: 4 }}>{account.bank}</div>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15 }}>
            {mem ? `${mem.emoji} ${mem.name}` : '—'}
          </div>
        </div>

        {/* Base: saldo + agência/conta */}
        <div>
          <div style={{ ...NUM, fontSize: 22, fontWeight: 800, marginBottom: 6, color: balance >= 0 ? '#4ade80' : '#f87171' }}>
            {R$(balance)}
          </div>
          <div className="flex jcb" style={{ fontSize: 9, opacity: .65 }}>
            <span>Agência {account.agency || '—'} &nbsp;·&nbsp; Conta {account.accountNumber || '—'}</span>
          </div>
        </div>

        <div style={{ position: 'absolute', top: 8, right: 10, fontSize: 9, opacity: .5, fontWeight: 600 }}>
          {selected ? '▼ Aberto' : 'Ver lançamentos →'}
        </div>
      </div>

      <div className="card-sm" style={{ borderRadius: '0 0 12px 12px', borderTop: 'none', padding: '8px 12px 10px' }}>
        <div className="flex jce" style={{ gap: 5 }}>
          <button className="btn-icon" style={{ padding: '3px 7px', fontSize: 12 }} onClick={onEdit}>✏️</button>
          <button className="btn-icon" style={{ padding: '3px 7px', fontSize: 12 }} onClick={onDelete}>🗑️</button>
        </div>
      </div>
    </div>
  );
}
