import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import AccountForm from '../AccountForm';

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
});
