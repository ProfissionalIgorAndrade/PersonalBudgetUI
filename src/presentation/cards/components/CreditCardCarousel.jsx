import React, { useRef, useState, useEffect, useCallback } from 'react';
import CardTile from './CardTile';

const CARD_WIDTH = 220; // px — largura fixa do CardTile no carrossel
const GAP        = 14;  // px — gap entre cards
const ARROW_W    = 40;  // px — espaço reservado para cada seta

/**
 * CreditCardCarousel
 *
 * Carrossel horizontal CONTIDO — o overflow é controlado por slicing
 * de array, nunca por overflow-x: auto no container. Isso elimina qualquer
 * possibilidade de scroll horizontal vazar para o body da página.
 *
 * Props:
 *   cards              — Card[]
 *   members            — Profile[]
 *   selectedCardId     — string | null
 *   cardStatementTotal — (id: string) => number
 *   activeMonth        — string (YYYY-MM)
 *   onSelect           — (card) => void
 *   onEdit             — (card) => void
 *   onDelete           — (card) => void
 *   onOpenMore         — () => void
 *   startIndex         — number (controlled)
 *   onStartIndexChange — (i: number) => void
 */
export default function CreditCardCarousel({
  cards,
  members,
  selectedCardId,
  cardStatementTotal,
  activeMonth,
  onSelect,
  onEdit,
  onDelete,
  onOpenMore,
  startIndex = 0,
  onStartIndexChange,
}) {
  const wrapRef    = useRef(null);
  const [containerWidth, setContainerWidth] = useState(900);

  // Mede a largura do wrapper com ResizeObserver
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width;
      if (w && w > 0) setContainerWidth(w);
    });
    ro.observe(el);
    setContainerWidth(el.getBoundingClientRect().width || 900);
    return () => ro.disconnect();
  }, []);

  // Quantos cards cabem na área visível (deduz as duas setas)
  const visibleCount = Math.max(
    1,
    Math.floor((containerWidth - ARROW_W * 2 + GAP) / (CARD_WIDTH + GAP)),
  );

  const maxStart  = Math.max(0, cards.length - visibleCount);
  const safeStart = Math.min(startIndex, maxStart);

  const visibleCards = cards.slice(safeStart, safeStart + visibleCount);
  // Quantos cards não aparecem no viewport atual
  const hiddenCount  = Math.max(0, cards.length - visibleCount);

  const prev = useCallback(() => {
    onStartIndexChange?.(Math.max(0, safeStart - 1));
  }, [safeStart, onStartIndexChange]);

  const next = useCallback(() => {
    onStartIndexChange?.(Math.min(maxStart, safeStart + 1));
  }, [safeStart, maxStart, onStartIndexChange]);

  if (cards.length === 0) return null;

  return (
    <div ref={wrapRef} className="cc-carousel-wrap">
      {/* Seta esquerda */}
      <button
        className="cc-carousel-arrow"
        onClick={prev}
        disabled={safeStart === 0}
        aria-label="Cartão anterior"
      >
        ‹
      </button>

      {/* Track: apenas os cards visíveis (sem overflow DOM) */}
      <div className="cc-carousel-track">
        {visibleCards.map(c => (
          <div key={c.id} style={{ flex: `0 0 ${CARD_WIDTH}px`, minWidth: CARD_WIDTH }}>
            <CardTile
              card={c}
              spent={cardStatementTotal(c.id)}
              statementMonth={activeMonth}
              members={members}
              selected={selectedCardId === c.id}
              onSelect={() => onSelect?.(c)}
              onEdit={() => onEdit?.(c)}
              onDelete={() => onDelete?.(c)}
            />
          </div>
        ))}

        {/* Botão "+N cartões" quando há cartões além do viewport */}
        {hiddenCount > 0 && (
          <button
            className="cc-carousel-more"
            onClick={onOpenMore}
            aria-label={`Ver mais ${hiddenCount} cartões`}
          >
            <span style={{ fontSize: 18, fontWeight: 900 }}>+{hiddenCount}</span>
            <span style={{ fontSize: 11 }}>cartões</span>
          </button>
        )}
      </div>

      {/* Seta direita */}
      <button
        className="cc-carousel-arrow"
        onClick={next}
        disabled={safeStart >= maxStart}
        aria-label="Próximo cartão"
      >
        ›
      </button>
    </div>
  );
}
