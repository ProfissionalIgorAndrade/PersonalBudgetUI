import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import ImpactForm from '../ImpactForm';

afterEach(cleanup);

const noop = () => {};

function submit(container) {
  fireEvent.submit(container.querySelector('form'));
}

describe('ImpactForm', () => {
  it('renders expense and income type buttons', () => {
    render(<ImpactForm onSave={noop} onClose={noop} />);
    expect(screen.getByText(/Despesa/)).toBeTruthy();
    expect(screen.getByText(/Receita/)).toBeTruthy();
  });

  it('defaults to Expense type', () => {
    render(<ImpactForm onSave={noop} onClose={noop} />);
    const expBtn = screen.getByText(/Despesa/).closest('button');
    expect(expBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('switches to Income type on click', () => {
    render(<ImpactForm onSave={noop} onClose={noop} />);
    const incBtn = screen.getByText(/Receita/).closest('button');
    fireEvent.click(incBtn);
    expect(incBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('renders Única and Parcelada mode buttons', () => {
    render(<ImpactForm onSave={noop} onClose={noop} />);
    expect(screen.getByText('Única')).toBeTruthy();
    expect(screen.getByText('Parcelada')).toBeTruthy();
    expect(screen.queryByText('Mensal')).toBeNull();
  });

  it('shows installment count field only for Parcelada mode', () => {
    render(<ImpactForm onSave={noop} onClose={noop} />);
    expect(screen.queryByText(/Número de parcelas/)).toBeNull();

    fireEvent.click(screen.getByText('Parcelada'));
    expect(screen.getByText(/Número de parcelas/)).toBeTruthy();
  });

  it('calls onSave with correct data for a valid expense form', () => {
    const onSave = vi.fn();
    const { container } = render(<ImpactForm onSave={onSave} onClose={noop} />);

    fireEvent.change(screen.getByPlaceholderText(/Ex:/), { target: { value: 'Aluguel' } });
    const amountInput = container.querySelector('[inputmode="decimal"]');
    fireEvent.change(amountInput, { target: { value: '1500,00' } });
    fireEvent.blur(amountInput);
    const dateInput = container.querySelector('input[type="date"]');
    fireEvent.change(dateInput, { target: { value: '2027-03-01' } });

    submit(container);

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      description: 'Aluguel',
      type: 'Expense',
      startDate: '2027-03-01',
      mode: 'Single',
    }));
  });

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn();
    render(<ImpactForm onSave={noop} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });

  it('pre-fills fields from initial prop', () => {
    const initial = {
      description: 'Parcela TV', amount: 200, type: 'Expense',
      mode: 'Installment', startDate: '2027-01-01', installmentCount: 6,
    };
    render(<ImpactForm initial={initial} onSave={noop} onClose={noop} />);
    expect(screen.getByDisplayValue('Parcela TV')).toBeTruthy();
    const parceladaBtn = screen.getByText('Parcelada').closest('button');
    expect(parceladaBtn.getAttribute('aria-pressed')).toBe('true');
  });
});
