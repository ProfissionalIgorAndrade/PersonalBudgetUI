import React from 'react';
import { R$ } from '../../../core/utils/format';
import { FLAGS, CARD_GRADIENTS } from '../../../core/constants/index';
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
  if (CARD_GRADIENTS[c]) return CARD_GRADIENTS[c];
  try { return `linear-gradient(135deg, ${hexDarken(c, 0.12)} 0%, ${hexDarken(c, 0.32)} 100%)`; }
  catch { return 'linear-gradient(135deg, #1e1b4b, #312e81)'; }
};

export default function CardTile({ card, spent, members, selected, onSelect, onEdit, onDelete }) {
  const mem    = findMember(members, card.memberId);
  const usePct = card.limit > 0 ? Math.min(spent / card.limit * 100, 100) : 0;
  return (
    <div style={{ borderRadius: 14, outline: selected ? '2px solid var(--primary)' : '2px solid transparent', outlineOffset: 3, transition: 'outline-color .2s' }}>
      <div
        className="cc-visual cc-clickable"
        style={{ background: getGrad(card.color), padding: '14px 16px', minHeight: 110 }}
        onClick={onSelect}
      >
        <div>
          <div style={{ fontSize: 10, opacity: .6, marginBottom: 2 }}>{FLAGS[card.flag] || 'Cartão'}</div>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: mem ? 4 : 0 }}>{card.name}</div>
          {mem && <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13 }}>{mem.emoji} {mem.name}</div>}
        </div>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: 2, opacity: .8 }}>
            •••• •••• •••• {card.lastDigits || '????'}
          </div>
          <div style={{ marginTop: 6, fontSize: 9, opacity: .65 }}>
            <span>Fecha {card.closingDay || '?'} · Vence {card.dueDay || '?'}</span>
          </div>
        </div>
        <div style={{ position: 'absolute', top: 8, right: 10, fontSize: 9, opacity: .5, fontWeight: 600 }}>
          {selected ? '▼ Aberto' : 'Ver faturas →'}
        </div>
      </div>
      <div className="card-sm" style={{ borderRadius: '0 0 12px 12px', borderTop: 'none', padding: '8px 12px 10px' }}>
        <div className="flex jcb aic" style={{ marginBottom: 4 }}>
          <span className="txxs tmuted">Gasto este mês</span>
          <span className="txxs tmuted" style={NUM}>{R$(spent)} / {R$(card.limit)}</span>
        </div>
        <div className="progress-bar" style={{ marginBottom: 8 }}>
          <div className="progress-fill" style={{
            width: usePct + '%',
            background: usePct > 80 ? 'var(--red)' : usePct > 50 ? 'var(--yellow)' : 'var(--primary)',
          }} />
        </div>
        <div className="flex jcb aic">
          <span style={{ fontSize: 13, fontWeight: 700, color: usePct > 80 ? 'var(--red)' : 'var(--text)', ...NUM }}>
            {usePct.toFixed(0)}%
          </span>
          <div style={{ display: 'flex', gap: 5 }}>
            <button className="btn-icon" style={{ padding: '3px 7px', fontSize: 12 }} onClick={onEdit}>✏️</button>
            <button className="btn-icon" style={{ padding: '3px 7px', fontSize: 12 }} onClick={onDelete}>🗑️</button>
          </div>
        </div>
      </div>
    </div>
  );
}
