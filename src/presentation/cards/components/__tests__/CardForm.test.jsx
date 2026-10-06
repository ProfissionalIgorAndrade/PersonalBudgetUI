import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import CardForm from '../CardForm';

afterEach(cleanup);

const members = [
  { id: 'p-andreza', name: 'Andreza Maia', emoji: '👩' },
  { id: 'p-igor', name: 'Igor Andrade', emoji: '🧑' },
];
const form = (f, onChange = () => {}) => (
  <CardForm f={f} onChange={onChange} members={members}
    onSave={() => {}} onClose={() => {}} />
);

const memberSelect = () =>
  screen.getByText('Membro *').closest('.form-group').querySelector('select');

const base = { name: 'Inter Black', flag: 'visa', limit: 15000, dueDay: 29, color: '#f87171' };

describe('CardForm member field', () => {
  // With no empty option, a blank memberId rendered as the first member,
  // looking selected while the state stayed empty. Saving stored nothing and
  // appeared to have worked.
  it('shows nothing selected when the card has no member', () => {
    render(form({ ...base, memberId: '' }));
    expect(memberSelect().value).toBe('');
  });

  it('offers an explicit empty option', () => {
    render(form({ ...base, memberId: '' }));
    const options = [...memberSelect().options].map(o => o.value);
    expect(options[0]).toBe('');
  });

  it('shows the member a card already has', () => {
    render(form({ ...base, memberId: 'p-igor' }));
    expect(memberSelect().value).toBe('p-igor');
  });

  it('reports the chosen member', () => {
    const onChange = vi.fn();
    render(form({ ...base, memberId: '' }, onChange));
    fireEvent.change(memberSelect(), { target: { value: 'p-andreza' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ memberId: 'p-andreza' }));
  });

  it('marks the field required', () => {
    render(form({ ...base, memberId: '' }));
    expect(memberSelect().required).toBe(true);
  });
});

describe('CardForm fields', () => {
  it('has no last digits, debit account or closing day field', () => {
    render(form({ ...base, memberId: 'p-igor' }));
    expect(screen.queryByText(/Últimos 4 Dígitos/i)).toBeNull();
    expect(screen.queryByText(/Conta para débito/i)).toBeNull();
    expect(screen.queryByText(/Fechamento/i)).toBeNull();
  });

  it('keeps name, flag, due day, limit, member and color', () => {
    render(form({ ...base, memberId: 'p-igor' }));
    for (const label of ['Nome do Cartão', 'Bandeira', 'Dia Vencimento', 'Limite (R$)', 'Membro *', 'Cor']) {
      expect(screen.getByText(label)).toBeDefined();
    }
  });
});
