import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { baseline, impacts, opening, scenarioAll, summaryAll } from '../logic/__tests__/fixtures';

const h = vi.hoisted(() => ({ state: {} }));
vi.mock('../../../application/hooks/useSimulator', () => ({
  HORIZONS: [1, 3, 6, 12, 24],
  useSimulator: () => h.state,
}));

import SimulatorView from '../SimulatorView';

afterEach(cleanup);

const sim = (id, over) => ({
  id, enabled: true, amountKind: 'PerInstallment', installments: null, months: null, startMonth: '2026-10', ...over,
});
const SIMS = [
  sim('car', { description: 'Carro', type: 'Expense', mode: 'Installment', amount: 150, installments: 12 }),
  sim('phone', { description: 'Celular', type: 'Expense', mode: 'Installment', amount: 1000, amountKind: 'Total', installments: 12, startMonth: '2026-12' }),
  sim('salary', { description: 'Freela', type: 'Income', mode: 'Monthly', amount: 1200, startMonth: '2026-12' }),
  sim('trip', { description: 'Viagem', type: 'Expense', mode: 'Single', amount: 6000, startMonth: '2027-01' }),
];

const RESULT = {
  referenceMonth: '2026-10',
  openingBalance: opening,
  assumptions: { lookbackMonths: 3, monthsWithData: 3, averageIncome: 4000, averageVariableExpense: 900.25, notes: ['Nota de regra A', 'Nota de regra B'] },
  baseline, impacts, scenario: scenarioAll, summary: summaryAll,
  warnings: [{ impactId: 'phone', code: 'AfterWindow', message: '"Celular" continua depois de mar/27: o total completo inclui todas as ocorrências.' }],
};

const state = (over = {}) => ({
  simulations: SIMS, months: 6, setMonths: vi.fn(), result: RESULT, loading: false, refetching: false, error: null,
  retry: vi.fn(), addSimulation: vi.fn(), editSimulation: vi.fn(), removeSimulation: vi.fn(),
  toggleSimulation: vi.fn(), reset: vi.fn(), limitReached: false, ...over,
});

beforeEach(() => { h.state = state(); });

const norm = (s) => s.replace(/\u00a0/g, ' ');
const rowText = (label) => norm(screen.getByText(label).closest('tr').textContent);
const goTab = (name) => fireEvent.click(screen.getByRole('tab', { name }));

describe('SimulatorView: cabeçalho e resumo', () => {
  it('título igual ao do menu e horizontes 1, 3, 6, 12 e 24', () => {
    render(<SimulatorView />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('E se...?');
    const seg = screen.getByRole('group', { name: 'Horizonte da projeção' });
    expect(within(seg).getAllByRole('button').map(b => b.textContent)).toEqual(['1 mês', '3 meses', '6 meses', '12 meses', '24 meses']);
    expect(within(seg).getByText('6 meses').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(within(seg).getByText('12 meses'));
    expect(h.state.setMonths).toHaveBeenCalledWith(12);
  });

  it('tiles: saldo hoje, menor saldo, primeiro negativo e impacto', () => {
    render(<SimulatorView />);
    const tiles = within(screen.getByRole('group', { name: 'Resumo da projeção' }));
    const text = norm(screen.getByRole('group', { name: 'Resumo da projeção' }).textContent);
    expect(text).toContain('R$ 5.000,00');
    expect(text).toContain('sem caixinhas');
    expect(text).toMatch(/Base: R\$ 3\.400,00 \(out\/26\)/);
    expect(text).toMatch(/Com simulações: -R\$ 768,41 \(jan\/27\)/);
    expect(tiles.getByText('Base: nenhum mês negativo')).toBeTruthy();
    expect(tiles.getByText('Com simulações: negativo em jan/27')).toBeTruthy();
    expect(text).toContain('No horizonte: −R$ 2.433,32');
    expect(text).toContain('Total completo: −R$ 4.000,00');
  });

  it('desligar uma simulação recalcula o resumo na hora', () => {
    h.state = state({ simulations: SIMS.map(s => (s.id === 'trip' ? { ...s, enabled: false } : s)) });
    render(<SimulatorView />);
    const text = norm(screen.getByRole('group', { name: 'Resumo da projeção' }).textContent);
    expect(text).toContain('Com simulações: nenhum mês negativo');
    expect(text).toContain('No horizonte: +R$ 3.566,68');
  });
});

describe('SimulatorView: abas', () => {
  it('é um tablist com três abas; setas e Home/End movem a seleção', () => {
    render(<SimulatorView />);
    expect(screen.getByRole('tablist', { name: 'Visões da projeção' })).toBeTruthy();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map(t => t.textContent)).toEqual(['No mês', 'Mês a mês', 'Por simulação']);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('tabindex')).toBe('-1');

    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Mês a mês' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(screen.getByRole('tab', { name: 'Mês a mês' }).id);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Mês a mês' }), { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Por simulação' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Por simulação' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'No mês' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'No mês' }), { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'Por simulação' }).getAttribute('aria-selected')).toBe('true');
  });
});

describe('SimulatorView: aba No mês', () => {
  it('o primeiro mês é o restante do mês e mostra a conta linha a linha', () => {
    render(<SimulatorView />);
    expect(screen.getByText(/Restante de outubro/)).toBeTruthy();
    expect(rowText('Receitas previstas')).toContain('R$ 500,00');
    expect(rowText('Compromissos (fixos e parcelas)')).toContain('−R$ 1.800,00');
    expect(rowText('Gastos variáveis estimados')).toContain('−R$ 300,00');
    expect(rowText('Resultado base')).toContain('−R$ 1.600,00');
    expect(rowText('Resultado base')).toContain('negativo');
    expect(rowText('Carro')).toContain('−R$ 150,00');
    expect(rowText('Resultado com simulações')).toContain('−R$ 1.750,00');
    expect(rowText('Diferença para a base')).toContain('−R$ 150,00');
  });

  it('uma linha por simulação ligada; desligada some da conta', () => {
    h.state = state({ simulations: SIMS.map(s => (s.id === 'phone' ? { ...s, enabled: false } : s)) });
    render(<SimulatorView />);
    expect(screen.getByText('Carro')).toBeTruthy();
    expect(screen.getByText('Viagem')).toBeTruthy();
    expect(screen.queryByText('Celular')).toBeNull();
  });

  it('trocar o mês pelos chips recalcula as linhas', () => {
    render(<SimulatorView />);
    fireEvent.click(screen.getByRole('button', { name: 'jan/27' }));
    expect(screen.queryByText(/Restante de/)).toBeNull();
    expect(rowText('Viagem')).toContain('−R$ 6.000,00');
    expect(rowText('Resultado com simulações')).toContain('−R$ 5.733,58');
    expect(rowText('Saldo no fim do mês (com simulações)')).toContain('-R$ 768,41');
  });

  it('sem simulações ligadas, avisa que o cenário é a base', () => {
    h.state = state({ simulations: SIMS.map(s => ({ ...s, enabled: false })) });
    render(<SimulatorView />);
    expect(screen.getByText(/Nenhuma simulação ligada/)).toBeTruthy();
  });
});

describe('SimulatorView: aba Mês a mês e tabela gêmea', () => {
  it('mostra dois gráficos com marcas focáveis e legenda', () => {
    const { container } = render(<SimulatorView />);
    goTab('Mês a mês');
    expect(screen.getAllByRole('figure')).toHaveLength(2);
    const hits = container.querySelectorAll('.wi-hit');
    expect(hits).toHaveLength(12);
    expect(hits[0].getAttribute('tabindex')).toBe('0');
    const label = norm(hits[0].getAttribute('aria-label'));
    expect(label).toContain('restante de outubro');
    expect(label).toContain('Base');
    expect(label).toContain('Com simulações');
    expect(screen.getAllByRole('list', { name: 'Legenda' })).toHaveLength(2);
    expect(screen.getByText(/Primeiro mês: só o que falta acontecer/)).toBeTruthy();
    expect(screen.getByText(/negativo a partir de jan\/27/)).toBeTruthy();
  });

  it('o rótulo do mês negativo carrega texto, não só cor', () => {
    const { container } = render(<SimulatorView />);
    goTab('Mês a mês');
    const jan = norm(container.querySelectorAll('.wi-hit')[3].getAttribute('aria-label'));
    expect(jan).toContain('(negativo)');
  });

  it('o toggle Tabela troca os gráficos por uma tabela real com os mesmos números', () => {
    render(<SimulatorView />);
    goTab('Mês a mês');
    fireEvent.click(screen.getByRole('button', { name: 'Tabela' }));
    expect(screen.queryAllByRole('figure')).toHaveLength(0);
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(1 + 6);
    expect(screen.getAllByRole('columnheader').map(c => c.textContent)).toEqual([
      'Mês', 'Resultado base', 'Resultado com simulações', 'Saldo base', 'Saldo com simulações', 'Situação',
    ]);
    const first = norm(rows[1].textContent);
    expect(first).toContain('restante de outubro');
    expect(first).toContain('R$ 3.250,00');
    const jan = norm(rows[4].textContent);
    expect(jan).toContain('-R$ 768,41');
    expect(jan).toContain('Saldo negativo');
    expect(norm(rows[1].textContent)).toContain('Saldo positivo');
    fireEvent.click(screen.getByRole('button', { name: 'Gráfico' }));
    expect(screen.getAllByRole('figure')).toHaveLength(2);
  });
});

describe('SimulatorView: aba Por simulação', () => {
  it('lista cada item com interruptor, descrição legível e totais', () => {
    render(<SimulatorView />);
    goTab('Por simulação');
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(4);
    expect(switches[0].getAttribute('aria-checked')).toBe('true');
    const car = norm(screen.getByText('Carro').closest('li').textContent);
    expect(car).toContain('12× R$ 150,00 = R$ 1.800,00 · out/26 a set/27 · 6 parcelas dentro do horizonte');
    expect(car).toContain('No horizonte: −R$ 900,00');
    expect(car).toContain('Total completo: −R$ 1.800,00');
    const phone = norm(screen.getByText('Celular').closest('li').textContent);
    expect(phone).toContain('(última R$ 83,37)');
    expect(norm(screen.getByText('Freela').closest('li').textContent)).toContain('por mês');
  });

  it('o interruptor chama toggleSimulation com o id', () => {
    render(<SimulatorView />);
    goTab('Por simulação');
    fireEvent.click(screen.getByRole('switch', { name: 'Desligar Carro' }));
    expect(h.state.toggleSimulation).toHaveBeenCalledWith('car');
  });

  it('um item desligado aparece como desligado', () => {
    h.state = state({ simulations: SIMS.map(s => (s.id === 'trip' ? { ...s, enabled: false } : s)) });
    render(<SimulatorView />);
    goTab('Por simulação');
    const sw = screen.getByRole('switch', { name: 'Ligar Viagem' });
    expect(sw.getAttribute('aria-checked')).toBe('false');
    expect(sw.textContent).toContain('Desligada');
  });

  it('mostra o aviso do backend junto do item certo e só dele', () => {
    render(<SimulatorView />);
    goTab('Por simulação');
    const phone = screen.getByText('Celular').closest('li');
    expect(phone.textContent).toContain('Continua após o horizonte');
    expect(phone.textContent).toContain('continua depois de mar/27');
    expect(screen.getByText('Carro').closest('li').textContent).not.toContain('Continua após o horizonte');
  });

  it('linha final "Todas juntas" soma as ligadas', () => {
    render(<SimulatorView />);
    goTab('Por simulação');
    const all = screen.getByRole('group', { name: 'Todas juntas' });
    const t = norm(all.textContent);
    expect(t).toContain('4 ligadas');
    expect(t).toContain('No horizonte: −R$ 2.433,32');
    expect(t).toContain('Total completo: −R$ 4.000,00');
  });

  it('editar e adicionar abrem o formulário', () => {
    render(<SimulatorView />);
    goTab('Por simulação');
    fireEvent.click(screen.getByRole('button', { name: 'Editar Carro' }));
    expect(screen.getByRole('heading', { name: 'Editar simulação' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('heading', { name: 'Editar simulação' })).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: '+ Nova simulação' })[0]);
    expect(screen.getByRole('heading', { name: 'Nova simulação' })).toBeTruthy();
  });

  it('remover chama removeSimulation', () => {
    render(<SimulatorView />);
    goTab('Por simulação');
    fireEvent.click(screen.getByRole('button', { name: 'Remover Viagem' }));
    expect(h.state.removeSimulation).toHaveBeenCalledWith('trip');
  });
});

describe('SimulatorView: estados vazios, carregando e erro', () => {
  it('sem simulações: mensagem e chamada para adicionar; Limpar desabilitado', () => {
    h.state = state({ simulations: [], result: { ...RESULT, impacts: [], warnings: [] } });
    render(<SimulatorView />);
    goTab('Por simulação');
    expect(screen.getByText(/Nenhuma simulação ainda/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: '+ Nova simulação' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Limpar' }).disabled).toBe(true);
  });

  it('sem dados: avisa que a base é zero', () => {
    const zero = baseline.slice(0, 2).map(b => ({ ...b, income: 0, committed: 0, variable: 0, result: 0, balance: 0 }));
    h.state = state({
      simulations: [], result: {
        ...RESULT, baseline: zero, impacts: [], warnings: [],
        openingBalance: { ...opening, amount: 0, accounts: [] },
        assumptions: { ...RESULT.assumptions, monthsWithData: 0, averageIncome: null, averageVariableExpense: null },
      },
    });
    render(<SimulatorView />);
    expect(screen.getByText(/a base é zero/)).toBeTruthy();
  });

  it('carregando pela primeira vez, sem resultado', () => {
    h.state = state({ result: null, loading: true });
    render(<SimulatorView />);
    expect(screen.getAllByText('Calculando projeção…').length).toBeGreaterThan(0);
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('refazendo a chamada, o resultado anterior continua na tela, esmaecido', () => {
    h.state = state({ loading: true, refetching: true });
    const { container } = render(<SimulatorView />);
    expect(container.querySelector('.wi-body.is-refetching')).toBeTruthy();
    expect(screen.getByRole('tablist')).toBeTruthy();
  });

  it('erro aparece em role=alert com "Tentar de novo"', () => {
    h.state = state({ result: null, error: 'Impacto #1: o valor deve ser maior que zero.' });
    render(<SimulatorView />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Impacto #1: o valor deve ser maior que zero.');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(h.state.retry).toHaveBeenCalled();
  });

  it('erro com resultado anterior mantém o resumo na tela', () => {
    h.state = state({ error: 'Falhou' });
    render(<SimulatorView />);
    expect(screen.getByRole('alert').textContent).toContain('Falhou');
    expect(screen.getByRole('group', { name: 'Resumo da projeção' })).toBeTruthy();
  });
});

describe('SimulatorView: Limpar pede confirmação', () => {
  it('cancelar não limpa; confirmar limpa e fecha', () => {
    render(<SimulatorView />);
    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(screen.getByText('Limpar simulações?')).toBeTruthy();
    expect(screen.getByText(/Isso apaga as 4 simulações salvas/)).toBeTruthy();
    expect(h.state.reset).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(h.state.reset).not.toHaveBeenCalled();
    expect(screen.queryByText('Limpar simulações?')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Limpar tudo' }));
    expect(h.state.reset).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Limpar simulações?')).toBeNull();
  });
});

describe('SimulatorView: Como calculamos', () => {
  it('lista as contas do saldo de partida, as médias e as notas da API', () => {
    render(<SimulatorView />);
    expect(screen.getByText('Como calculamos')).toBeTruthy();
    expect(screen.getByText('Conta corrente')).toBeTruthy();
    expect(screen.getByText('Nota de regra A')).toBeTruthy();
    expect(screen.getByText('Nota de regra B')).toBeTruthy();
    expect(screen.getByText('3 de 3')).toBeTruthy();
    expect(norm(screen.getByLabelText('Médias usadas').textContent)).toContain('R$ 4.000,00');
  });
});
