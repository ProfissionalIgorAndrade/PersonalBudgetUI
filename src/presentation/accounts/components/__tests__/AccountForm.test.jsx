import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import AccountForm from '../AccountForm';
import { BANKS } from '../../../../core/constants/banks';

afterEach(cleanup);

const members = [{ id: 'm1', name: 'Igor', emoji: '🧑' }];

function Harness({ initial, onSave }) {
  const [f, setF] = useState(initial);
  return <AccountForm f={f} onChange={setF} onSave={() => onSave(f)} onClose={() => {}} members={members} />;
}

describe('AccountForm', () => {
  it('renders no agency or account number fields', () => {
    const { container } = render(<Harness initial={{ bank: 'Nubank', memberId: 'm1' }} onSave={() => {}} />);
    expect(container.textContent).not.toMatch(/Agência|Número da Conta/);
  });

  it('has an optional nickname field that is sent as name', () => {
    const onSave = vi.fn();
    render(<Harness initial={{ bank: 'Nubank', memberId: 'm1' }} onSave={onSave} />);
    fireEvent.change(screen.getByPlaceholderText(/Conta salário/), { target: { value: 'Salário' } });
    fireEvent.click(screen.getByText(/Salvar/));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].name).toBe('Salário');
  });

  it('still requires a member to save', () => {
    render(<Harness initial={{ bank: 'Nubank' }} onSave={() => {}} />);
    expect(screen.getByText(/Salvar/).disabled).toBe(true);
  });

  describe('bank select', () => {
    const bankOptions = () => {
      const { container } = render(<Harness initial={{ bank: 'Nubank', memberId: 'm1' }} onSave={() => {}} />);
      const select = container.querySelectorAll('select')[0];
      return { select, options: [...select.querySelectorAll('option')] };
    };

    it('lists every bank of the module', () => {
      const { options } = bankOptions();
      expect(options.map(o => o.value).sort()).toEqual(Object.keys(BANKS).sort());
      for (const o of options) expect(o.textContent).toBe(BANKS[o.value].label);
    });

    it('is alphabetical by label with Outro last', () => {
      const { options } = bankOptions();
      const labels = options.map(o => o.textContent);
      expect(labels[labels.length - 1]).toBe('Outro');
      const rest = labels.slice(0, -1);
      expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b, 'pt-BR')));
    });

    it('keeps the current bank selected and sends the enum key on change', () => {
      const onSave = vi.fn();
      const { container } = render(<Harness initial={{ bank: 'Nubank', memberId: 'm1' }} onSave={onSave} />);
      const select = container.querySelectorAll('select')[0];
      expect(select.value).toBe('Nubank');
      fireEvent.change(select, { target: { value: 'BancoDoBrasil' } });
      fireEvent.click(screen.getByText(/Salvar/));
      expect(onSave.mock.calls[0][0].bank).toBe('BancoDoBrasil');
    });
  });
});
