import React from 'react';
import { R$ } from '../../../core/utils/format';
import { ACC_TYPES } from '../../../core/constants/index';

export default function AccountTile({ account, balance, members, selected, onSelect, onEdit, onDelete }) {
  const mem = members.find(m => m.id === account.memberId);
  return (
    <div style={{ borderRadius: 14, outline: selected ? '2px solid var(--primary)' : '2px solid transparent', outlineOffset: 3, transition: 'outline-color .2s' }}>
      <div
        className="cc-clickable"
        style={{
          background: `linear-gradient(135deg, ${account.color}18, ${account.color}30)`,
          borderRadius: '12px 12px 0 0',
          border: `1px solid ${account.color}40`,
          borderBottom: 'none',
          padding: '18px 18px 16px',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }}
        onClick={onSelect}
      >
        <div style={{ position: 'absolute', right: -20, top: -20, width: 110, height: 110, borderRadius: '50%', background: `${account.color}12` }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3, fontWeight: 600, letterSpacing: .5 }}>
            {ACC_TYPES[account.type] || account.type}{account.bank ? ` · ${account.bank}` : ''}
          </div>
          <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, marginBottom: 14 }}>{account.name}</div>
          <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Inter', sans-serif", fontVariantNumeric: 'tabular-nums', color: balance >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {R$(balance)}
          </div>
          {mem && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 10 }}>{mem.emoji} {mem.name}</div>}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: account.color, borderRadius: 0 }} />
        <div style={{ position: 'absolute', top: 10, right: 14, fontSize: 10, opacity: .45, fontWeight: 600 }}>
          {selected ? '▼ Aberto' : 'Ver lançamentos →'}
        </div>
      </div>
      <div className="card-sm" style={{ borderRadius: '0 0 12px 12px', borderTop: 'none', paddingTop: 10 }}>
        <div className="flex gap2" style={{ gap: 6, justifyContent: 'flex-end' }}>
          <button className="btn-icon" onClick={onEdit}>✏️</button>
          <button className="btn-icon" onClick={onDelete}>🗑️</button>
        </div>
      </div>
    </div>
  );
}
