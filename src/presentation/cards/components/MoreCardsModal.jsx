import React, { useState, useMemo } from 'react';
import { R$ } from '../../../core/utils/format';
import { findMember } from '../../../application/mappers/index';
import { getCardStatus, STATUS_LABELS, STATUS_COLORS } from '../utils';
import Modal from '../../shared/components/Modal';
import CardBrandLogo from './CardBrandLogo';

const FILTER_ALL = 'all';

/**
 * MoreCardsModal
 *
 * Modal size="full" que exibe todos os cartões em grid responsivo.
 * Possui busca por nome/dono e filtros por status do cartão.
 *
 * Props:
 *   cards              — Card[]
 *   members            — Profile[]
 *   cardStatementTotal — (id: string) => number
 *   activeMonth        — string (YYYY-MM)
 *   selectedCardId     — string | null
 *   onClose            — () => void
 *   onSelectCard       — (card, index) => void
 */
export default function MoreCardsModal({
  cards,
  members,
  cardStatementTotal,
  activeMonth,
  selectedCardId,
  onClose,
  onSelectCard,
}) {
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState(FILTER_ALL);

  // Contagem por status (estimativa client-side)
  const counts = useMemo(() => {
    const c = { open: 0, closed: 0, overdue: 0 };
    cards.forEach(card => { c[getCardStatus(card)]++; });
    return c;
  }, [cards]);

  // Filtragem + busca
  const filtered = useMemo(() => {
    let list = cards;

    // Filtro por status
    if (filter !== FILTER_ALL) {
      list = list.filter(c => getCardStatus(c) === filter);
    }

    // Busca por nome do cartão ou nome do dono
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c => {
        if (c.name.toLowerCase().includes(q)) return true;
        const mem = findMember(members, c.memberId);
        if (mem && mem.name.toLowerCase().includes(q)) return true;
        return false;
      });
    }

    return list;
  }, [cards, members, filter, search]);

  const tabs = [
    { id: FILTER_ALL, label: `Todos (${cards.length})` },
    { id: 'open',    label: `Aberta (${counts.open})` },
    { id: 'closed',  label: `Fechada (${counts.closed})` },
    { id: 'overdue', label: `Vencida (${counts.overdue})` },
  ];

  const handleSelect = (card) => {
    const idx = cards.indexOf(card);
    onSelectCard(card, idx >= 0 ? idx : 0);
  };

  return (
    <Modal
      title={`Todos os Cartões de Crédito`}
      onClose={onClose}
      size="full"
    >
      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: -8, marginBottom: 14 }}>
        Você tem <strong>{cards.length}</strong> {cards.length === 1 ? 'cartão cadastrado' : 'cartões cadastrados'}.
      </p>

      {/* Busca */}
      <div className="cc-modal-search-wrap" style={{ marginBottom: 12 }}>
        <span className="cc-modal-search-icon">🔍</span>
        <input
          className="form-input"
          style={{ paddingLeft: 34 }}
          placeholder="Buscar por nome ou dono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Buscar cartão"
        />
      </div>

      {/* Filtros por status */}
      <div className="fatura-tabs" style={{ marginBottom: 16 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            className={`fatura-tab${filter === t.id ? ' active' : ''}`}
            onClick={() => setFilter(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid de cartões */}
      {filtered.length === 0 ? (
        <div className="cc-modal-empty">
          {search || filter !== FILTER_ALL
            ? 'Nenhum cartão encontrado para os filtros selecionados.'
            : 'Nenhum cartão cadastrado.'}
        </div>
      ) : (
        <div className="cc-modal-grid">
          {filtered.map(card => {
            const mem   = findMember(members, card.memberId);
            const spent = cardStatementTotal(card.id);
            const status = getCardStatus(card);
            const isSelected = card.id === selectedCardId;

            return (
              <div
                key={card.id}
                className={`cc-modal-card${isSelected ? ' selected' : ''}`}
                onClick={() => handleSelect(card)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && handleSelect(card)}
                aria-pressed={isSelected}
              >
                {/* Mini visual do cartão */}
                <div
                  style={{
                    background: card.color || 'var(--surface2)',
                    padding: '12px 14px',
                    minHeight: 80,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderRadius: '10px 10px 0 0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{card.name}</div>
                      {mem && (
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.72)', marginTop: 1 }}>
                          {mem.emoji} {mem.name}
                        </div>
                      )}
                    </div>
                    <CardBrandLogo flag={card.flag} cardName={card.name} size="sm" />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontVariantNumeric: 'tabular-nums', fontWeight: 800, fontSize: 14, color: '#fff' }}>
                      {R$(spent)}
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                      Vence {card.dueDay}
                    </div>
                  </div>
                </div>

                {/* Barra de status */}
                <div style={{
                  background: 'var(--surface2)',
                  padding: '6px 10px',
                  borderRadius: '0 0 10px 10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLORS[status] }}>
                    {STATUS_LABELS[status]}
                  </span>
                  {card.lastDigits && (
                    <span style={{ fontSize: 9, color: 'var(--muted)' }}>••{card.lastDigits}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
