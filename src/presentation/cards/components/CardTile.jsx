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

const monthLabel = (ym) => {
  if (!ym) return '';
  const [y, m] = String(ym).split('-');
  return `${m}/${y}`;
};

export default function CardTile({ card, spent, statementMonth, members, selected, onSelect, onEdit, onDelete }) {
  const mem    = findMember(members, card.memberId);
  const usePct = card.limit > 0 ? Math.min(spent / card.limit * 100, 100) : 0;
  // "Limite atual" lido como o que ainda resta, não o limite contratado — é o
  // número acionável. Nunca negativo na exibição.
  const available = Math.max(Number(card.limit || 0) - Number(spent || 0), 0);
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
        <div style={{ position: 'absolute', top: 8, right: 10, fontSize: 9, opacity: .5, fontWeight: 600 }}>
          {selected ? '▼ Aberto' : 'Ver faturas →'}
        </div>
      </div>
      <div className="card-sm" style={{ borderRadius: '0 0 12px 12px', borderTop: 'none', padding: '10px 12px' }}>
        {/* Fatura e limite disponível na mesma linha. A barra de uso, o
            percentual e a linha separada de limite saíram: o número que
            importa é quanto ainda dá para gastar, e ele agora está escrito. */}
        <div className="flex jcb aib" style={{ marginBottom: 10, gap: 10 }}>
          <div>
            <div className="txxs tmuted" style={{ marginBottom: 2 }}>
              Fatura{statementMonth ? ` ${monthLabel(statementMonth)}` : ''}
            </div>
            <div style={{ ...NUM, fontSize: 16, fontWeight: 800 }}>{R$(spent)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="txxs tmuted" style={{ marginBottom: 2 }}>Limite disponível</div>
            <div style={{
              ...NUM, fontSize: 16, fontWeight: 800,
              color: available <= 0 ? 'var(--red)' : usePct > 80 ? 'var(--yellow)' : 'var(--text)',
            }}>
              {R$(available)}
            </div>
          </div>
        </div>

        <div className="flex jce" style={{ gap: 5 }}>
          <button className="btn-icon" style={{ padding: '3px 7px', fontSize: 12 }} onClick={onEdit}>✏️</button>
          <button className="btn-icon" style={{ padding: '3px 7px', fontSize: 12 }} onClick={onDelete}>🗑️</button>
        </div>
      </div>
    </div>
  );
}
