import React from 'react';
import { R$ } from '../../../core/utils/format';
import { findMember } from '../../../application/mappers/index';
import { getCardStatus, STATUS_LABELS, STATUS_COLORS } from '../utils';

/**
 * Item compacto para o sidebar do modo lista.
 *
 * Props:
 *   card        — Card
 *   members     — Profile[]
 *   spent       — number (total da fatura no mês selecionado)
 *   selected    — boolean
 *   onSelect    — () => void
 *   onEdit      — () => void
 *   onDelete    — () => void
 */
export default function CreditCardListItem({ card, members, spent = 0, selected, onSelect, onEdit, onDelete }) {
  const mem    = findMember(members, card.memberId);
  const status = getCardStatus(card);

  return (
    <div
      className={`cc-list-item${selected ? ' selected' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onSelect?.()}
      aria-pressed={selected}
    >
      <div className="cc-list-item-swatch" style={{ background: card.color }} />

      <div className="cc-list-item-body">
        <div className="cc-list-item-name">{card.name}</div>
        {mem && (
          <div className="cc-list-item-owner">{mem.emoji} {mem.name}</div>
        )}
      </div>

      <div className="cc-list-item-right">
        <div className="cc-list-item-amount">{R$(spent)}</div>
        <div
          className="cc-list-item-due"
          style={{ color: STATUS_COLORS[status] }}
        >
          {STATUS_LABELS[status]} · dia {card.dueDay}
        </div>
      </div>

      {/* Ações visíveis só no hover */}
      <div className="cc-list-item-actions" onClick={e => e.stopPropagation()}>
        <button className="btn-icon" style={{ padding: '2px 6px', fontSize: 11 }} onClick={onEdit}>✏️</button>
        <button className="btn-icon" style={{ padding: '2px 6px', fontSize: 11 }} onClick={onDelete}>🗑️</button>
      </div>
    </div>
  );
}
