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

/**
 * AccountTile
 *
 * Props:
 *   compact — boolean (default false)
 *     Versão menor para uso na sidebar. Mantém identidade visual mas
 *     com padding e fontes reduzidos.
 */
export default function AccountTile({ account, flow, monthLabel, members, selected, onSelect, onEdit, onDelete, compact = false }) {
  const mem = findMember(members, account.memberId);

  const facePad    = compact ? '10px 12px' : '14px 16px';
  const faceMinH   = compact ? 90           : 110;
  const bankSize   = compact ? 12            : 15;
  const amountSize = compact ? 13            : 17;

  return (
    <div style={{ borderRadius: 14, outline: selected ? '2px solid var(--primary)' : '2px solid transparent', outlineOffset: 3, transition: 'outline-color .2s' }}>
      <div
        className="cc-visual cc-clickable"
        style={{ background: getGrad(account.color), padding: facePad, minHeight: faceMinH }}
        onClick={onSelect}
      >
        {/* Topo: banco + titular na face */}
        <div style={{ marginBottom: compact ? 4 : 0 }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: bankSize }}>{account.bank}</div>
          {mem && (
            <div className="cc-face-owner">{mem.emoji} {mem.name}</div>
          )}
        </div>

        {/* Base: movimento do mês */}
        <div>
          <div className="flex jcb aib" style={{ gap: compact ? 6 : 10, marginBottom: compact ? 4 : 6 }}>
            <div>
              <div style={{ fontSize: compact ? 8 : 9, opacity: .6, marginBottom: 2 }}>Receita</div>
              <div style={{ ...NUM, fontSize: amountSize, fontWeight: 800, color: '#4ade80' }}>
                {R$(flow?.income || 0)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: compact ? 8 : 9, opacity: .6, marginBottom: 2 }}>Despesa</div>
              <div style={{ ...NUM, fontSize: amountSize, fontWeight: 800, color: '#f87171' }}>
                {R$(flow?.expense || 0)}
              </div>
            </div>
          </div>

          {/* Agência/conta e mês — omitido no compacto para economizar espaço */}
          {!compact && (
            <div className="flex jcb" style={{ fontSize: 9, opacity: .65 }}>
              <span>Agência {account.agency || '—'} &nbsp;·&nbsp; Conta {account.accountNumber || '—'}</span>
              {monthLabel && <span>{ymLabel(monthLabel)}</span>}
            </div>
          )}
        </div>

        <div style={{ position: 'absolute', top: 8, right: 10, fontSize: 9, opacity: .5, fontWeight: 600 }}>
          {selected ? '▼ Aberto' : 'Ver →'}
        </div>
      </div>

      <div className="card-sm" style={{ borderRadius: '0 0 12px 12px', borderTop: 'none', padding: compact ? '6px 10px' : '8px 12px' }}>
        <div className="flex jcb aic" style={{ gap: 8 }}>
          <span style={{ fontSize: compact ? 10 : 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selected ? '▼ aberto' : 'ver lançamentos →'}
          </span>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            <button className="btn-icon" style={{ padding: '3px 7px', fontSize: compact ? 11 : 12 }} onClick={onEdit}>✏️</button>
            <button className="btn-icon" style={{ padding: '3px 7px', fontSize: compact ? 11 : 12 }} onClick={onDelete}>🗑️</button>
          </div>
        </div>
      </div>
    </div>
  );
}
