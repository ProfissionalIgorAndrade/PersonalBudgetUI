import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import MoreCardsModal from '../MoreCardsModal';

afterEach(cleanup);

const makeCards = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `c${i + 1}`,
    name: `Cartão ${i + 1}`,
    flag: 'visa',
    limit: 10000,
    closingDay: 1,   // hoje >= 1, então status depende do dueDay
    dueDay: 28,      // status = 'open' para a maioria dos dias do mês
    color: '#2dd4bf',
    memberId: 'm1',
    lastDigits: '0000',
  }));

const members = [
  { id: 'm1', name: 'Igor',   emoji: '🧑' },
  { id: 'm2', name: 'Andreza', emoji: '👩' },
];

const modal = (cards, props = {}) => (
  <MoreCardsModal
    cards={cards}
    members={members}
    cardStatementTotal={() => 0}
    activeMonth="2026-09"
    selectedCardId={null}
    onClose={() => {}}
    onSelectCard={() => {}}
    {...props}
  />
);

describe('MoreCardsModal — renderização', () => {
  it('exibe o título', () => {
    render(modal(makeCards(3)));
    expect(screen.getByText('Todos os Cartões de Crédito')).toBeTruthy();
  });

  it('exibe a contagem total de cartões', () => {
    render(modal(makeCards(5)));
    // A contagem aparece no parágrafo "Você tem 5 cartões cadastrados"
    expect(screen.getByText(/Você tem/)).toBeTruthy();
  });

  it('exibe todos os cartões sem filtro', () => {
    render(modal(makeCards(4)));
    expect(screen.getByText('Cartão 1')).toBeTruthy();
    expect(screen.getByText('Cartão 4')).toBeTruthy();
  });

  it('exibe mensagem quando nenhum cartão é encontrado', () => {
    render(modal([]));
    expect(screen.getByText(/Nenhum cartão cadastrado/)).toBeTruthy();
  });
});

describe('MoreCardsModal — busca', () => {
  it('filtra cartões por nome', () => {
    const cards = [
      { ...makeCards(1)[0], name: 'Nubank Ultravioleta', memberId: 'm1' },
      { ...makeCards(1)[0], id: 'c2', name: 'Inter Black', memberId: 'm1' },
    ];
    render(modal(cards));
    const input = screen.getByPlaceholderText(/Buscar/);
    fireEvent.change(input, { target: { value: 'nubank' } });
    expect(screen.getByText('Nubank Ultravioleta')).toBeTruthy();
    expect(screen.queryByText('Inter Black')).toBeNull();
  });

  it('filtra por nome do dono (case-insensitive)', () => {
    const cards = [
      { ...makeCards(1)[0], memberId: 'm1' },   // Igor
      { ...makeCards(1)[0], id: 'c2', memberId: 'm2' }, // Andreza
    ];
    render(modal(cards));
    const input = screen.getByPlaceholderText(/Buscar/);
    fireEvent.change(input, { target: { value: 'andreza' } });
    // Apenas o card da Andreza deve aparecer
    expect(screen.queryByText(/Igor/)).toBeNull();
    expect(screen.getByText(/Andreza/)).toBeTruthy();
  });

  it('exibe mensagem de resultado vazio quando busca não bate', () => {
    render(modal(makeCards(3)));
    const input = screen.getByPlaceholderText(/Buscar/);
    fireEvent.change(input, { target: { value: 'xyz_inexistente' } });
    expect(screen.getByText(/Nenhum cartão encontrado/)).toBeTruthy();
  });
});

describe('MoreCardsModal — seleção', () => {
  it('chama onSelectCard com o card e o índice correto ao clicar', () => {
    const onSelectCard = vi.fn();
    const cards = makeCards(3);
    render(modal(cards, { onSelectCard }));
    // Clica no primeiro card (role=button, 0-index + botão fechar da modal)
    const buttons = screen.getAllByRole('button');
    // O primeiro button é o ✕ do Modal, depois vêm os cards
    const cardButtons = buttons.filter(b => b.getAttribute('aria-pressed') !== null);
    fireEvent.click(cardButtons[0]);
    expect(onSelectCard).toHaveBeenCalledWith(cards[0], 0);
  });

  it('marca o card selecionado com classe selected', () => {
    const cards = makeCards(2);
    const { container } = render(modal(cards, { selectedCardId: 'c1' }));
    const selectedCards = container.querySelectorAll('.cc-modal-card.selected');
    expect(selectedCards).toHaveLength(1);
  });
});

describe('MoreCardsModal — dois cartões com mesmo nome, donos diferentes', () => {
  it('exibe donos distintos', () => {
    const cards = [
      { id: 'c1', name: 'Inter Black', flag: 'master', limit: 15000, closingDay: 1, dueDay: 28, color: '#ff7a00', memberId: 'm1', lastDigits: '1111' },
      { id: 'c2', name: 'Inter Black', flag: 'master', limit: 15000, closingDay: 1, dueDay: 28, color: '#ff7a00', memberId: 'm2', lastDigits: '2222' },
    ];
    render(modal(cards));
    expect(screen.getByText(/Igor/)).toBeTruthy();
    expect(screen.getByText(/Andreza/)).toBeTruthy();
  });
});
