import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import CreditCardListItem from '../CreditCardListItem';

afterEach(cleanup);

const card = {
  id: 'c1', name: 'Inter Black', flag: 'master',
  limit: 15000, closingDay: 1, dueDay: 28,
  color: '#ff7a00', memberId: 'm1',
};
const members = [{ id: 'm1', name: 'Igor', emoji: '🧑' }];

const item = (props) => (
  <CreditCardListItem
    card={card}
    members={members}
    spent={0}
    selected={false}
    onSelect={() => {}}
    onEdit={() => {}}
    onDelete={() => {}}
    {...props}
  />
);

describe('CreditCardListItem — exibição', () => {
  it('mostra o nome do cartão', () => {
    render(item());
    expect(screen.getByText('Inter Black')).toBeTruthy();
  });

  it('mostra o dono do cartão', () => {
    render(item());
    expect(screen.getByText(/Igor/)).toBeTruthy();
  });

  it('mostra o emoji do dono', () => {
    render(item());
    expect(screen.getByText(/🧑/)).toBeTruthy();
  });

  it('mostra o valor da fatura formatado', () => {
    render(item({ spent: 5008.74 }));
    expect(screen.getByText(/5\.008,74/)).toBeTruthy();
  });

  it('aplica classe selected quando selecionado', () => {
    const { container } = render(item({ selected: true }));
    expect(container.querySelector('.cc-list-item.selected')).toBeTruthy();
  });

  it('não aplica classe selected quando não selecionado', () => {
    const { container } = render(item({ selected: false }));
    expect(container.querySelector('.cc-list-item.selected')).toBeNull();
  });
});

describe('CreditCardListItem — interação', () => {
  it('chama onSelect ao clicar no item', () => {
    const onSelect = vi.fn();
    const { container } = render(item({ onSelect }));
    // Clica no elemento principal (role=button com aria-pressed), não nos botões de ação
    fireEvent.click(container.querySelector('.cc-list-item'));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('chama onEdit ao clicar no botão de edição', () => {
    const onEdit = vi.fn();
    render(item({ onEdit }));
    const buttons = screen.getAllByRole('button');
    // primeiro botão é o item inteiro, depois ✏️ e 🗑️
    fireEvent.click(buttons[1]); // ✏️
    expect(onEdit).toHaveBeenCalledOnce();
  });
});

describe('CreditCardListItem — dois cartões com mesmo nome, donos diferentes', () => {
  it('exibe donos distintos para dois cartões Inter Black', () => {
    const card2 = { ...card, id: 'c2', memberId: 'm2' };
    const members2 = [
      { id: 'm1', name: 'Igor', emoji: '🧑' },
      { id: 'm2', name: 'Andreza', emoji: '👩' },
    ];
    render(
      <>
        <CreditCardListItem card={card}  members={members2} spent={0} selected={false} onSelect={() => {}} onEdit={() => {}} onDelete={() => {}} />
        <CreditCardListItem card={card2} members={members2} spent={0} selected={false} onSelect={() => {}} onEdit={() => {}} onDelete={() => {}} />
      </>
    );
    expect(screen.getByText(/Igor/)).toBeTruthy();
    expect(screen.getByText(/Andreza/)).toBeTruthy();
  });
});
