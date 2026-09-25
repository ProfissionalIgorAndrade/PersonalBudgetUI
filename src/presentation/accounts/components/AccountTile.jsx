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

const ymLabel = (ym) => {
  if (!ym) return '';
  const [y, m] = String(ym).split('-');
  return `${m}/${y}`;
};

export default function AccountTile({ account, flow, monthLabel, members, selected, onSelect, onEdit, onDelete }) {
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
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15 }}>{account.bank}</div>
        </div>

        {/* Base: movimento do mês + agência/conta */}
        <div>
          <div className="flex jcb aib" style={{ gap: 10, marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 9, opacity: .6, marginBottom: 2 }}>Receita</div>
              <div style={{ ...NUM, fontSize: 17, fontWeight: 800, color: '#4ade80' }}>
                {R$(flow?.income || 0)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, opacity: .6, marginBottom: 2 }}>Despesa</div>
              <div style={{ ...NUM, fontSize: 17, fontWeight: 800, color: '#f87171' }}>
                {R$(flow?.expense || 0)}
              </div>
            </div>
          </div>
          <div className="flex jcb" style={{ fontSize: 9, opacity: .65 }}>
            <span>Agência {account.agency || '—'} &nbsp;·&nbsp; Conta {account.accountNumber || '—'}</span>
            {monthLabel && <span>{ymLabel(monthLabel)}</span>}
          </div>
        </div>

        <div style={{ position: 'absolute', top: 8, right: 10, fontSize: 9, opacity: .5, fontWeight: 600 }}>
          {selected ? '▼ Aberto' : 'Ver lançamentos →'}
        </div>
      </div>

      <div className="card-sm" style={{ borderRadius: '0 0 12px 12px', borderTop: 'none', padding: '8px 12px' }}>
        {/* Dono e ações na mesma linha, igual ao card de cartão. */}
        <div className="flex jcb aic" style={{ gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {mem ? `${mem.emoji} ${mem.name}` : '—'}
          </span>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            <button className="btn-icon" style={{ padding: '3px 7px', fontSize: 12 }} onClick={onEdit}>✏️</button>
            <button className="btn-icon" style={{ padding: '3px 7px', fontSize: 12 }} onClick={onDelete}>🗑️</button>
          </div>
        </div>
      </div>
    </div>
  );
}
