import React from 'react';
import { R$ } from '../../../core/utils/format';
import { FLAGS, CARD_GRADIENTS } from '../../../core/constants/index';
import { findMember } from '../../../application/mappers/index';
import CardBrandLogo from './CardBrandLogo';

const NUM = { fontFamily: "'Inter', sans-serif", fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1' };

function hexDarken(hex, f) {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * f);
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * f);
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * f);
  const toH = n => Math.min(255, Math.max(0, n)).toString(16).padStart(2, '0');
  return `#${toH(r)}${toH(g)}${toH(b)}`;
}

const getGradDark = c => {
  if (CARD_GRADIENTS[c]) return CARD_GRADIENTS[c];
  try { return `linear-gradient(135deg, ${hexDarken(c, 0.12)} 0%, ${hexDarken(c, 0.32)} 100%)`; }
  catch { return 'linear-gradient(135deg, #1e1b4b, #312e81)'; }
};

const getGradLight = c => {
  try { return `linear-gradient(135deg, ${hexDarken(c, 0.42)} 0%, ${hexDarken(c, 0.68)} 100%)`; }
  catch { return 'linear-gradient(135deg, #312e81, #4f46e5)'; }
};

const isLightTheme = () =>
  typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light';

const getGrad = c => isLightTheme() ? getGradLight(c) : getGradDark(c);

const monthLabel = (ym) => {
  if (!ym) return '';
  const [y, m] = String(ym).split('-');
  return `${m}/${y}`;
};

function progressColor(pct) {
  if (pct >= 90) return 'var(--red)';
  if (pct >= 70) return 'var(--yellow)';
  return 'var(--primary)';
}

export default function CardTile({ card, spent, statementMonth, members, selected, onSelect, onEdit, onDelete, compact = false }) {
  const mem     = findMember(members, card.memberId);
  const usePct  = card.limit > 0 ? Math.min(spent / card.limit * 100, 100) : 0;
  const available = Math.max(Number(card.limit || 0) - Number(spent || 0), 0);

  return (
    <div style={{ borderRadius: 14, outline: selected ? '2px solid var(--primary)' : '2px solid transparent', outlineOffset: 3, transition: 'outline-color .2s' }}>
      <div
        className="cc-visual cc-clickable"
        style={{ background: getGrad(card.color), padding: compact ? '10px 12px' : '14px 16px', minHeight: compact ? 105 : 140 }}
        onClick={onSelect}
      >
        {/* Linha 1: bandeira + logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 9, opacity: .6 }}>{FLAGS[card.flag] || 'Cartão'}</div>
          <CardBrandLogo flag={card.flag} cardName={card.name} size="sm" />
        </div>

        {/* Linha 2: nome + dono */}
        <div style={{ marginBottom: 2 }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: compact ? 12 : 14, lineHeight: 1.25 }}>{card.name}</div>
          {mem && <div className="cc-face-owner">{mem.emoji} {mem.name}</div>}
        </div>

        {/* Linha 3: barra de progresso */}
        <div className="cc-face-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${usePct}%`, background: progressColor(usePct) }} />
          </div>
          <span className="cc-face-progress-pct">{Math.round(usePct)}%</span>
        </div>

        {/* Linha 4: fatura + limite disponível */}
        <div className="flex jcb aib" style={{ gap: 10 }}>
          <div>
            <div style={{ fontSize: 9, opacity: .6, marginBottom: 2 }}>
              Fatura{statementMonth ? ` ${monthLabel(statementMonth)}` : ''}
            </div>
            <div style={{ ...NUM, fontSize: 15, fontWeight: 800 }}>{R$(spent)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, opacity: .6, marginBottom: 2 }}>Disponível</div>
            <div style={{
              ...NUM, fontSize: 15, fontWeight: 800,
              color: available <= 0 ? '#f87171' : usePct > 80 ? '#fbbf24' : undefined,
            }}>
              {R$(available)}
            </div>
          </div>
        </div>

        {/* Linha 5: vencimento no canto inferior direito */}
        {!compact && card.dueDay && (
          <div className="cc-face-due" style={{ marginTop: 6 }}>
            Vence dia {card.dueDay}
          </div>
        )}
      </div>

      {/* Footer: somente ações */}
      {!compact && (
        <div className="card-sm" style={{ borderRadius: '0 0 12px 12px', borderTop: 'none', padding: '8px 12px' }}>
          <div className="flex jcb aic" style={{ gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selected ? '▼ aberto' : 'ver fatura →'}
            </span>
            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
              <button className="btn-icon" style={{ padding: '3px 7px', fontSize: 12 }} onClick={onEdit}>✏️</button>
              <button className="btn-icon" style={{ padding: '3px 7px', fontSize: 12 }} onClick={onDelete}>🗑️</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
