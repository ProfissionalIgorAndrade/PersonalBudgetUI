import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import SimulationStrip from '../SimulationStrip';
import { simulationName } from '../../logic/labels';
import { assignSimColors } from '../../logic/compose';
import { buildSchedules } from '../../logic/schedule';

afterEach(cleanup);

const norm = (s) => s.replace(/ /g, ' ');
const sim = (id, over) => ({
  id, enabled: true, amountKind: 'PerInstallment', installments: null, months: null, startMonth: '2026-03', ...over,
});
const SIMS = [
  sim('car', { description: 'Carro', type: 'Expense', mode: 'Installment', amount: 150, installments: 12 }),
  sim('salary', { description: '', type: 'Income', mode: 'Monthly', amount: 1200, startMonth: '2026-12', enabled: false }),
];
const toInfos = (sims) => {
  const colors = assignSimColors(sims);
  return sims.map((s, i) => ({ sim: s, name: simulationName(s, i), slot: colors[s.id] }));
};

const setup = (props = {}) => {
  const handlers = { onToggle: vi.fn(), onEdit: vi.fn(), onRemove: vi.fn(), onAdd: vi.fn() };
  const utils = render(
    <SimulationStrip
      infos={toInfos(SIMS)} scheduleById={new Map(buildSchedules(SIMS, '2026-03', 12).map((s) => [s.id, s]))} warnings={[]}
      limitReached={false} {...handlers} {...props}
    />,
  );
  return { ...handlers, ...utils };
};

describe('SimulationStrip', () => {
  it('um cartão por simulação: descrição ou "Simulação N", parcela legível e estado', () => {
    setup();
    const cards = screen.getAllByRole('listitem');
    expect(cards).toHaveLength(2);
    const car = norm(cards[0].textContent);
    expect(car).toContain('Carro');
    expect(car).toContain('R$ 150,00/mês de mar/26 a fev/27');
    expect(car).toContain('12× R$ 150,00 = R$ 1.800,00');
    expect(car).toContain('Ligada');
    const second = norm(cards[1].textContent);
    expect(second).toContain('Simulação 2');
    expect(second).toContain('Desligada');
  });

  it('o interruptor, editar e remover usam o nome do cartão', () => {
    const { onToggle, onEdit, onRemove } = setup();
    fireEvent.click(screen.getByRole('switch', { name: 'Desligar Carro' }));
    expect(onToggle).toHaveBeenCalledWith('car');
    expect(screen.getByRole('switch', { name: 'Ligar Simulação 2' }).getAttribute('aria-checked')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Editar Carro' }));
    expect(onEdit).toHaveBeenCalledWith(SIMS[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Remover Simulação 2' }));
    expect(onRemove).toHaveBeenCalledWith('salary');
  });

  it('o aviso da janela aparece só no cartão da simulação', () => {
    setup({ warnings: [{ impactId: 'car', code: 'AfterWindow', message: 'Continua depois de mar/27.' }] });
    const [car, other] = screen.getAllByRole('listitem');
    expect(car.textContent).toContain('Continua após o período');
    expect(car.textContent).toContain('Continua depois de mar/27.');
    expect(other.textContent).not.toContain('Continua após o período');
  });

  it('a cor segue a posição na lista, não o estado ligado', () => {
    const { container } = setup();
    const cards = container.querySelectorAll('.wi-sc');
    expect(cards[0].className).toContain('wi-cat-1');
    expect(cards[1].className).toContain('wi-cat-2');
    expect(cards[1].className).toContain('is-off');
  });

  it('sem simulações: convida a adicionar uma', () => {
    const { onAdd } = setup({ infos: [] });
    expect(screen.getByText(/Nenhuma simulação ainda/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '+ Nova simulação' }));
    expect(onAdd).toHaveBeenCalled();
  });

  it('no limite, avisa', () => {
    setup({ limitReached: true });
    expect(screen.getByRole('status').textContent).toContain('Limite de 50 simulações');
  });
});
