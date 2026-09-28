import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import ScenarioBuilder from '../ScenarioBuilder';

vi.mock('../ImpactForm', () => ({
  default: ({ onSave, onClose }) => (
    <div data-testid="impact-form">
      <button onClick={() => onSave({ description: 'Novo', amount: 500, type: 'Expense',
        startDate: '2027-01-01', recurrence: 'None', endDate: null })}>
        Salvar
      </button>
      <button onClick={onClose}>Cancelar</button>
    </div>
  ),
}));

afterEach(cleanup);

const emptyScenario = { impacts: [] };
const withImpact = {
  impacts: [{ id: 'i1', description: 'Carro', amount: 50000, type: 'Expense',
    startDate: '2027-01-01', recurrence: 'None', endDate: null }],
};

const addBtn = () => screen.getByRole('button', { name: /Adicionar impacto/ });

describe('ScenarioBuilder', () => {
  it('shows empty state when no impacts', () => {
    render(<ScenarioBuilder scenario={emptyScenario} onAdd={() => {}} onEdit={() => {}} onRemove={() => {}} />);
    expect(screen.getByText(/Nenhum impacto/)).toBeTruthy();
  });

  it('shows add button always', () => {
    render(<ScenarioBuilder scenario={emptyScenario} onAdd={() => {}} onEdit={() => {}} onRemove={() => {}} />);
    expect(addBtn()).toBeTruthy();
  });

  it('renders existing impacts', () => {
    render(<ScenarioBuilder scenario={withImpact} onAdd={() => {}} onEdit={() => {}} onRemove={() => {}} />);
    expect(screen.getByText('Carro')).toBeTruthy();
  });

  it('opens ImpactForm on add click', () => {
    render(<ScenarioBuilder scenario={emptyScenario} onAdd={() => {}} onEdit={() => {}} onRemove={() => {}} />);
    fireEvent.click(addBtn());
    expect(screen.getByTestId('impact-form')).toBeTruthy();
  });

  it('calls onAdd when ImpactForm saves', () => {
    const onAdd = vi.fn();
    render(<ScenarioBuilder scenario={emptyScenario} onAdd={onAdd} onEdit={() => {}} onRemove={() => {}} />);
    fireEvent.click(addBtn());
    fireEvent.click(screen.getByText('Salvar'));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ description: 'Novo', amount: 500 }));
  });

  it('calls onRemove when trash button is clicked', () => {
    const onRemove = vi.fn();
    render(<ScenarioBuilder scenario={withImpact} onAdd={() => {}} onEdit={() => {}} onRemove={onRemove} />);
    fireEvent.click(screen.getByTitle('Remover'));
    expect(onRemove).toHaveBeenCalledWith('i1');
  });

  it('hides form after cancel', () => {
    render(<ScenarioBuilder scenario={emptyScenario} onAdd={() => {}} onEdit={() => {}} onRemove={() => {}} />);
    fireEvent.click(addBtn());
    expect(screen.getByTestId('impact-form')).toBeTruthy();
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByTestId('impact-form')).toBeNull();
  });
});
