import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import HealthCustomizer from '../HealthCustomizer';
import { useHealthLayout } from '../useHealthLayout';
import { CATALOG, LAYOUT_KEY } from '../layout';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

function Harness() {
  const { layout, toggle, move, reset } = useHealthLayout();
  return <HealthCustomizer layout={layout} onToggle={toggle} onMove={move} onReset={reset} onClose={() => {}} />;
}

const stored = () => JSON.parse(localStorage.getItem(LAYOUT_KEY));

describe('HealthCustomizer', () => {
  it('lists every catalog widget, all off, and none of the mandatory ones', () => {
    render(<Harness />);
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(CATALOG.length);
    expect(boxes.every(b => !b.checked)).toBe(true);
    for (const title of ['Veredito', 'Resultado do mês', 'Pilares da saúde', 'Plano de futuro']) {
      expect(screen.queryByText(title)).toBeNull();
    }
  });

  it('persists a toggle in pb_health_layout and restores it on remount', () => {
    const { unmount } = render(<Harness />);
    fireEvent.click(screen.getByLabelText(/Regra 50\/30\/20/));
    expect(stored().find(w => w.id === 'rule').on).toBe(true);
    unmount();
    render(<Harness />);
    expect(screen.getByLabelText(/Regra 50\/30\/20/).checked).toBe(true);
  });

  it('persists the new order after moving a widget', () => {
    render(<Harness />);
    const second = CATALOG[1];
    fireEvent.click(screen.getByRole('button', { name: `Subir ${second.title}` }));
    expect(stored()[0].id).toBe(second.id);
  });

  it('disables moving past the first and last positions', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: `Subir ${CATALOG[0].title}` }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: `Descer ${CATALOG.at(-1).title}` }).disabled).toBe(true);
  });

  it('turns everything off with "Desligar todos"', () => {
    render(<Harness />);
    fireEvent.click(screen.getByLabelText(/Regra 50\/30\/20/));
    fireEvent.click(screen.getByRole('button', { name: 'Desligar todos' }));
    expect(stored().every(w => w.on === false)).toBe(true);
  });

  it('ignores mandatory and unknown ids found in storage', () => {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify([{ id: 'verdict', on: true }, { id: 'ghost', on: true }, { id: 'pace', on: true }]));
    render(<Harness />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(CATALOG.length);
    expect(screen.getByLabelText(/Ritmo de gasto/).checked).toBe(true);
  });
});
