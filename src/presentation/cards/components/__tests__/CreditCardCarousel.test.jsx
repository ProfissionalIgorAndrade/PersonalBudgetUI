import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import CreditCardCarousel from '../CreditCardCarousel';

afterEach(cleanup);

// Mock ResizeObserver — reporta width fixa imediatamente
const mockWidth = { value: 900 };
beforeEach(() => {
  globalThis.ResizeObserver = class {
    constructor(cb) { this._cb = cb; }
    observe() {
      // Simula primeira medição
      this._cb([{ contentRect: { width: mockWidth.value } }]);
    }
    disconnect() {}
  };
});

const makeCards = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `c${i + 1}`,
    name: `Cartão ${i + 1}`,
    flag: 'visa',
    limit: 10000,
    closingDay: 10,
    dueDay: 20,
    color: '#2dd4bf',
    memberId: 'm1',
  }));

const members = [{ id: 'm1', name: 'Igor', emoji: '🧑' }];

const carousel = (cards, props = {}) => (
  <CreditCardCarousel
    cards={cards}
    members={members}
    selectedCardId={null}
    cardStatementTotal={() => 0}
    activeMonth="2026-09"
    onSelect={() => {}}
    onEdit={() => {}}
    onDelete={() => {}}
    onOpenMore={() => {}}
    startIndex={0}
    onStartIndexChange={() => {}}
    {...props}
  />
);

describe('CreditCardCarousel — visibilidade', () => {
  it('renderiza null quando não há cartões', () => {
    const { container } = render(carousel([]));
    expect(container.firstChild).toBeNull();
  });

  it('mostra botão "+N cartões" quando há mais cards que o viewport', () => {
    // width=900, CARD_WIDTH=220, GAP=14, ARROW_W=40
    // visibleCount = floor((900 - 80 + 14) / (220+14)) = floor(834/234) = 3
    // com 6 cartões → hiddenCount = 6 - 3 = 3
    mockWidth.value = 900;
    const cards = makeCards(6);
    render(carousel(cards));
    expect(screen.getByText(/cartões/)).toBeTruthy();
    expect(screen.getByText('+3')).toBeTruthy();
  });

  it('não mostra "+N cartões" quando todos os cards cabem', () => {
    // width=900 → visibleCount=3; com 3 cartões → hiddenCount=0
    mockWidth.value = 900;
    const cards = makeCards(3);
    render(carousel(cards));
    expect(screen.queryByText(/cartões/)).toBeNull();
  });

  it('renderiza exatamente visibleCount cartões no track', () => {
    mockWidth.value = 900; // visibleCount=3
    const cards = makeCards(6);
    const { container } = render(carousel(cards));
    // Cada card está dentro de .cc-carousel-track > div
    const track = container.querySelector('.cc-carousel-track');
    const cardDivs = track.querySelectorAll(':scope > div');
    expect(cardDivs).toHaveLength(3);
  });
});

describe('CreditCardCarousel — navegação', () => {
  it('seta esquerda fica desabilitada quando startIndex=0', () => {
    mockWidth.value = 900;
    render(carousel(makeCards(6), { startIndex: 0 }));
    const prevBtn = screen.getByLabelText('Cartão anterior');
    expect(prevBtn.disabled).toBe(true);
  });

  it('seta direita fica desabilitada quando na última página', () => {
    mockWidth.value = 900; // visibleCount=3, maxStart=3
    render(carousel(makeCards(6), { startIndex: 3 }));
    const nextBtn = screen.getByLabelText('Próximo cartão');
    expect(nextBtn.disabled).toBe(true);
  });

  it('chama onStartIndexChange com valor incrementado ao clicar em próximo', () => {
    mockWidth.value = 900;
    const onStartIndexChange = vi.fn();
    render(carousel(makeCards(6), { startIndex: 0, onStartIndexChange }));
    fireEvent.click(screen.getByLabelText('Próximo cartão'));
    expect(onStartIndexChange).toHaveBeenCalledWith(1);
  });

  it('chama onStartIndexChange com valor decrementado ao clicar em anterior', () => {
    mockWidth.value = 900;
    const onStartIndexChange = vi.fn();
    render(carousel(makeCards(6), { startIndex: 2, onStartIndexChange }));
    fireEvent.click(screen.getByLabelText('Cartão anterior'));
    expect(onStartIndexChange).toHaveBeenCalledWith(1);
  });

  it('clamp: startIndex maior que maxStart exibe a última página', () => {
    mockWidth.value = 900; // visibleCount=3, cards=4, maxStart=1
    const cards = makeCards(4);
    // startIndex=99 deve ser clamped para 1
    render(carousel(cards, { startIndex: 99 }));
    // Deve mostrar cartões 2, 3, 4 (índices 1, 2, 3)
    expect(screen.getByText('Cartão 2')).toBeTruthy();
    expect(screen.getByText('Cartão 4')).toBeTruthy();
  });
});

describe('CreditCardCarousel — modal overflow', () => {
  it('chama onOpenMore ao clicar no botão "+N cartões"', () => {
    mockWidth.value = 900;
    const onOpenMore = vi.fn();
    render(carousel(makeCards(6), { onOpenMore }));
    fireEvent.click(screen.getByLabelText(/Ver mais/));
    expect(onOpenMore).toHaveBeenCalledOnce();
  });
});
