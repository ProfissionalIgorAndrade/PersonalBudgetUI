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
  id, enabled: true, amountKind: 'PerInstallment', installments: null, months: null, startMonth: '2026-03',
  ownerUserId: 'u1', ownerName: 'Igor', isOwner: true, ...over,
});
const SIMS = [
  sim('car', { description: 'Carro', type: 'Expense', mode: 'Installment', amount: 150, installments: 12 }),
  sim('salary', { description: '', type: 'Income', mode: 'Monthly', amount: 1200, startMonth: '2026-12', enabled: false }),
];
const MEMBERS = [
  { id: 'p1', name: 'Igor', emoji: '🧔', color: '#112233', userId: 'u1' },
  { id: 'p2', name: 'Andreza', emoji: '👩', color: '#aa3366', userId: 'u2' },
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
    const { onToggle, onEdit, onRemove } = setup({ members: MEMBERS });
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

  describe('dono e permissões', () => {
    const SHARED = [
      sim('mine', { description: 'Minha', type: 'Expense', mode: 'Single', amount: 10 }),
      sim('theirs', { description: 'Dela', type: 'Expense', mode: 'Single', amount: 20, ownerUserId: 'u2', ownerName: 'Andreza', isOwner: false, enabled: false }),
      sim('ghost', { description: 'Sumido', type: 'Income', mode: 'Single', amount: 30, ownerUserId: 'u9', ownerName: 'Bruno', isOwner: false }),
      sim('anon', { description: 'Sem nome', type: 'Income', mode: 'Single', amount: 30, ownerUserId: 'u9', ownerName: '', isOwner: false }),
    ];
    const withShared = (props = {}) => setup({
      infos: toInfos(SHARED), scheduleById: new Map(buildSchedules(SHARED, '2026-03', 12).map((s) => [s.id, s])),
      members: MEMBERS, ...props,
    });
    const card = (i) => screen.getAllByRole('listitem')[i];

    it('a minha mostra "você" e o avatar do meu perfil, com a cor como acento', () => {
      const { container } = withShared();
      expect(norm(card(0).textContent)).toContain('você');
      const avatar = container.querySelectorAll('.wi-sc')[0].querySelector('.wi-sc-avatar');
      expect(avatar.textContent).toBe('🧔');
      expect(avatar.style.getPropertyValue('--mbr')).toBe('#112233');
      expect(avatar.getAttribute('aria-hidden')).toBe('true');
    });

    it('a de outra pessoa mostra "de Nome" e o avatar dela', () => {
      const { container } = withShared();
      expect(norm(card(1).textContent)).toContain('de Andreza');
      expect(container.querySelectorAll('.wi-sc')[1].querySelector('.wi-sc-avatar').textContent).toBe('👩');
    });

    it('sem perfil em members usa o ownerName da API, sem avatar do perfil; sem nome, rótulo neutro', () => {
      const { container } = withShared();
      expect(norm(card(2).textContent)).toContain('de Bruno');
      expect(container.querySelectorAll('.wi-sc')[2].querySelector('.wi-sc-avatar').textContent).toBe('👤');
      expect(norm(card(3).textContent)).toContain('de Membro da família');
    });

    it('editar e remover só no cartão do dono', () => {
      const { onEdit, onRemove } = withShared();
      expect(screen.getByRole('button', { name: 'Editar Minha' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Remover Minha' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Editar Dela' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Remover Dela' })).toBeNull();
      expect(screen.getAllByRole('button', { name: /^(Editar|Remover) / })).toHaveLength(2);
      fireEvent.click(screen.getByRole('button', { name: 'Remover Minha' }));
      expect(onRemove).toHaveBeenCalledWith('mine');
      expect(onEdit).not.toHaveBeenCalled();
    });

    it('quem não é dono vê a dica acessível "Criada por Nome"', () => {
      withShared();
      const hint = screen.getByRole('img', { name: 'Criada por Andreza' });
      expect(hint.getAttribute('title')).toBe('Criada por Andreza');
      expect(screen.getByRole('img', { name: 'Criada por Bruno' })).toBeTruthy();
      expect(screen.queryByRole('img', { name: /Criada por Igor/ })).toBeNull();
    });

    it('o liga/desliga vale para todos, inclusive nas de outras pessoas', () => {
      const { onToggle } = withShared();
      fireEvent.click(screen.getByRole('switch', { name: 'Ligar Dela' }));
      expect(onToggle).toHaveBeenCalledWith('theirs');
      expect(screen.getByRole('switch', { name: 'Ligar Dela' }).disabled).toBe(false);
    });

    it('durante a gravação, editar e remover ficam desabilitados', () => {
      withShared({ saving: true });
      expect(screen.getByRole('button', { name: 'Editar Minha' }).disabled).toBe(true);
      expect(screen.getByRole('button', { name: 'Remover Minha' }).disabled).toBe(true);
    });
  });
});
