import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import TxTable from '../TxTable';

afterEach(cleanup);

const rows = [
  { id: 't1', description: 'Barato',  amount: 10,  date: '2026-07-03', type: 'expense' },
  { id: 't2', description: 'Caro',    amount: 900, date: '2026-07-01', type: 'expense' },
  { id: 't3', description: 'Mediano', amount: 50,  date: '2026-07-02', type: 'expense' },
];

const descriptions = (container) =>
  [...container.querySelectorAll('tbody .csv-col-desc > div:first-child')].map(el => el.textContent);

describe('TxTable mobile sort selector', () => {
  it('starts on the same order as the table header: newest first', () => {
    const { container } = render(<TxTable rows={rows} />);
    expect(screen.getByLabelText('Ordenar por').value).toBe('date:desc');
    expect(descriptions(container)).toEqual(['Barato', 'Mediano', 'Caro']);
  });

  it('reorders the rows when another order is picked', () => {
    const { container } = render(<TxTable rows={rows} />);
    fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'amount:desc' } });
    expect(descriptions(container)).toEqual(['Caro', 'Mediano', 'Barato']);
  });

  it('follows a sort made on a header the selector does not list', () => {
    render(<TxTable rows={rows} />);
    fireEvent.click(screen.getByText('Tipo'));
    const select = screen.getByLabelText('Ordenar por');
    expect(select.value).toBe('type:desc');
    expect(select.selectedOptions[0].textContent).toBe('Ordem da tabela');
  });
});
