import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { baseline, baselineFull, impacts, opening } from '../logic/__tests__/fixtures';

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
  baseline: baselineFull, impacts, scenario: [], summary: {},
  warnings: [{ impactId: 'phone', code: 'AfterWindow', message: '"Celular" continua depois de mar/27: o total completo inclui todas as ocorrências.' }],
};

const state = (over = {}) => ({
  simulations: SIMS, months: 6, setMonths: vi.fn(), result: RESULT, loading: false, refetching: false, error: null,
  retry: vi.fn(), addSimulation: vi.fn(), editSimulation: vi.fn(), removeSimulation: vi.fn(),
  toggleSimulation: vi.fn(), reset: vi.fn(), limitReached: false, ...over,
});

beforeEach(() => { h.state = state(); });

const norm = (s) => s.replace(/ /g, ' ');
const verdictText = () => norm(screen.getByRole('region', { name: 'Veredito da simulação' }).textContent);
const withOff = (...ids) => SIMS.map((s) => (ids.includes(s.id) ? { ...s, enabled: false } : s));

describe('SimulatorView: uma página, sem abas nem tiles', () => {
  it('título, horizontes 1, 3, 6, 12 e 24, e a ordem: veredito, simulações, mês a mês, como calculamos', () => {
    const { container } = render(<SimulatorView />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('E se...?');
    const seg = screen.getByRole('group', { name: 'Horizonte da projeção' });
    expect(within(seg).getAllByRole('button').map((b) => b.textContent)).toEqual(['1 mês', '3 meses', '6 meses', '12 meses', '24 meses']);
    expect(within(seg).getByText('6 meses').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(within(seg).getByText('12 meses'));
    expect(h.state.setMonths).toHaveBeenCalledWith(12);

    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Resumo da projeção' })).toBeNull();
    expect(screen.queryByText(/Saldo hoje/)).toBeNull();

    const order = ['Veredito da simulação', 'Simulações', 'Mês a mês'];
    const nodes = [
      screen.getByRole('region', { name: order[0] }),
      screen.getByRole('heading', { name: order[1] }),
      screen.getByRole('heading', { name: order[2] }),
      container.querySelector('.wi-how'),
    ];
    for (let i = 0; i < nodes.length - 1; i++) {
      expect(nodes[i].compareDocumentPosition(nodes[i + 1]) & 4).toBeTruthy();
    }
  });

  it('o veredito de 6 meses com tudo ligado é crítico e cita o primeiro mês negativo', () => {
    render(<SimulatorView />);
    const t = verdictText();
    expect(t).toContain('Crítico');
    expect(t).toContain('Nos próximos 6 meses: falta total de R$ 436,57 (sem simulações: R$ 1.996,75).');
    expect(t).toContain('1 mês fica negativo; o primeiro é jan/27.');
  });

  it('o horizonte de 1 mês usa a frase do mês', () => {
    h.state = state({
      months: 1,
      result: { ...RESULT, baseline: baselineFull.slice(0, 1), impacts: impacts.map((i) => ({ ...i, monthly: i.monthly.slice(0, 1) })) },
    });
    render(<SimulatorView />);
    expect(verdictText()).toContain('Em out/26 o mês fecha com sobra de R$ 450,00 (sem simulações: R$ 600,00).');
    expect(screen.queryByText('Total do período')).toBeNull();
  });
});

describe('SimulatorView: liga/desliga recompõe sem nova chamada', () => {
  it('desligar a viagem tira o mês negativo e muda o veredito para atenção', () => {
    h.state = state({ simulations: withOff('trip') });
    render(<SimulatorView />);
    const t = verdictText();
    expect(t).toContain('Atenção');
    expect(t).toContain('Todos os meses seguem positivos; o mais apertado é jan/27, com R$ 266,42 de sobra.');
  });

  it('o interruptor do cartão chama toggleSimulation e nada mais (nenhum refetch)', () => {
    render(<SimulatorView />);
    fireEvent.click(screen.getByRole('switch', { name: 'Desligar Viagem' }));
    expect(h.state.toggleSimulation).toHaveBeenCalledWith('trip');
    expect(h.state.setMonths).not.toHaveBeenCalled();
    expect(h.state.retry).not.toHaveBeenCalled();
  });

  it('mesma resposta, outra lista de ligadas: o resultado vem do cliente', () => {
    const first = render(<SimulatorView />);
    expect(verdictText()).toContain('Crítico');
    first.unmount();
    h.state = state({ simulations: withOff('trip', 'car', 'phone') });   // só Freela
    render(<SimulatorView />);
    expect(verdictText()).toContain('Tudo certo');
    expect(verdictText()).toContain('o mais apertado é jan/27, com R$ 499,75 de sobra.');
  });

  it('todas desligadas: sem comparação com a base e com convite para ligar/adicionar', () => {
    h.state = state({ simulations: SIMS.map((s) => ({ ...s, enabled: false })) });
    render(<SimulatorView />);
    const t = verdictText();
    expect(t).not.toContain('sem simulações');
    expect(t).toContain('Nenhuma simulação ligada');
    fireEvent.click(screen.getByRole('button', { name: 'Tabela' }));
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual([
      'Mês', 'Receita', 'Despesa', 'Sobra do mês', 'Situação',
    ]);
  });
});

describe('SimulatorView: gráfico e tabela gêmeos', () => {
  it('começa no gráfico; o toggle troca por uma tabela real com os mesmos números', () => {
    const { container } = render(<SimulatorView />);
    expect(screen.getAllByRole('figure')).toHaveLength(1);
    expect(container.querySelectorAll('.wi-hit')).toHaveLength(6);
    const chartJan = norm(container.querySelectorAll('.wi-hit')[3].getAttribute('aria-label'));
    expect(chartJan).toContain('sobra do mês -R$ 5.733,58 (negativo)');

    fireEvent.click(screen.getByRole('button', { name: 'Tabela' }));
    expect(screen.queryAllByRole('figure')).toHaveLength(0);
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual([
      'Mês', 'Receita', 'Despesa', 'Carro', 'Celular', 'Freela', 'Viagem', 'Sobra do mês', 'Situação',
    ]);
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(1 + 6 + 1);
    expect(norm(rows[4].textContent)).toContain('−R$ 5.733,58');
    expect(norm(rows[4].textContent)).toContain('Negativo');
    expect(norm(rows[7].textContent)).toContain('Total do período');

    fireEvent.click(screen.getByRole('button', { name: 'Gráfico' }));
    expect(screen.getAllByRole('figure')).toHaveLength(1);
  });

  it('a soma de cada linha da tabela fecha com a sobra do mês', () => {
    render(<SimulatorView />);
    fireEvent.click(screen.getByRole('button', { name: 'Tabela' }));
    const cents = (txt) => {
      const m = norm(txt).match(/([−-])?R\$ ([\d.]+),(\d{2})/);
      return (m[1] ? -1 : 1) * (Number(m[2].replace(/\./g, '')) * 100 + Number(m[3]));
    };
    const body = screen.getAllByRole('row').slice(1, 7);
    body.forEach((row) => {
      const cells = within(row).getAllByRole('cell').slice(0, -1).map((c) => cents(c.textContent));
      const result = cells[cells.length - 1];
      const parts = cells.slice(0, -1);               // receita, despesa (negativa), simulações (assinadas)
      expect(parts.reduce((a, b) => a + b, 0)).toBe(result);
    });
  });

  it('desligar uma simulação remove a coluna dela na tabela e a faixa no gráfico', () => {
    h.state = state({ simulations: withOff('phone') });
    const { container } = render(<SimulatorView />);
    expect(container.querySelectorAll('.wi-mc-seg.wi-cat-2')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Tabela' }));
    expect(screen.queryByRole('columnheader', { name: 'Celular' })).toBeNull();
    expect(screen.getByRole('columnheader', { name: 'Carro' })).toBeTruthy();
  });
});

describe('SimulatorView: cartões das simulações', () => {
  it('um cartão por simulação, com parcela legível e aviso só no cartão certo', () => {
    render(<SimulatorView />);
    const cards = within(screen.getByRole('list', { name: 'Simulações' })).getAllByRole('listitem');
    expect(cards).toHaveLength(4);
    expect(norm(cards[0].textContent)).toContain('R$ 150,00/mês de out/26 a set/27');
    expect(cards[1].textContent).toContain('Continua após o período');
    expect(cards[0].textContent).not.toContain('Continua após o período');
  });

  it('descrição vazia vira "Simulação N" e é usada no interruptor', () => {
    h.state = state({ simulations: SIMS.map((s) => (s.id === 'trip' ? { ...s, description: '' } : s)) });
    render(<SimulatorView />);
    expect(screen.getByRole('switch', { name: 'Desligar Simulação 4' })).toBeTruthy();
  });

  it('editar e adicionar abrem o formulário; remover chama removeSimulation', () => {
    render(<SimulatorView />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar Carro' }));
    expect(screen.getByRole('heading', { name: 'Editar simulação' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getAllByRole('button', { name: '+ Nova simulação' })[0]);
    expect(screen.getByRole('heading', { name: 'Nova simulação' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remover Viagem' }));
    expect(h.state.removeSimulation).toHaveBeenCalledWith('trip');
  });
});

describe('SimulatorView: estados vazios, sem histórico, carregando e erro', () => {
  it('sem simulações: veredito sem comparação, convite para adicionar e Limpar desabilitado', () => {
    h.state = state({ simulations: [], result: { ...RESULT, impacts: [], warnings: [] } });
    render(<SimulatorView />);
    expect(screen.getByText(/Nenhuma simulação ainda/)).toBeTruthy();
    expect(verdictText()).not.toContain('sem simulações');
    expect(verdictText()).toContain('Adicione uma compra, renda ou gasto');
    expect(screen.getByRole('button', { name: 'Limpar' }).disabled).toBe(true);
  });

  it('sem histórico: diz que não há dados em vez de mostrar zeros', () => {
    const zero = baselineFull.slice(0, 2).map((b) => ({ ...b, income: 0, committed: 0, variable: 0, result: 0, balance: 0, fullMonth: { income: 0, expense: 0, result: 0 } }));
    h.state = state({
      simulations: [], result: {
        ...RESULT, baseline: zero, impacts: [], warnings: [],
        assumptions: { ...RESULT.assumptions, monthsWithData: 0, averageIncome: null, averageVariableExpense: null },
      },
    });
    const { container } = render(<SimulatorView />);
    expect(verdictText()).toContain('Sem dados');
    expect(verdictText()).toContain('Ainda não há histórico suficiente');
    expect(screen.getByText(/Sem histórico para estimar receita e despesa/)).toBeTruthy();
    expect(container.querySelector('.wi-hit')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tabela' })).toBeNull();
  });

  it('backend sem fullMonth: a tela continua funcionando com o aviso do primeiro mês', () => {
    h.state = state({ result: { ...RESULT, baseline } });
    render(<SimulatorView />);
    fireEvent.click(screen.getByRole('button', { name: 'Tabela' }));
    expect(norm(screen.getAllByRole('row')[1].textContent)).toContain('R$ 500,00');
    expect(screen.getByText(/ainda não envia o mês inteiro/)).toBeTruthy();
  });

  it('carregando pela primeira vez, sem resultado', () => {
    h.state = state({ result: null, loading: true });
    render(<SimulatorView />);
    expect(screen.getAllByText('Calculando projeção…').length).toBeGreaterThan(0);
    expect(screen.queryByRole('region', { name: 'Veredito da simulação' })).toBeNull();
  });

  it('refazendo a chamada, o resultado anterior continua na tela, esmaecido', () => {
    h.state = state({ loading: true, refetching: true });
    const { container } = render(<SimulatorView />);
    expect(container.querySelector('.wi-body.is-refetching')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Veredito da simulação' })).toBeTruthy();
  });

  it('erro aparece em role=alert com "Tentar de novo"', () => {
    h.state = state({ result: null, error: 'Impacto #1: o valor deve ser maior que zero.' });
    render(<SimulatorView />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Impacto #1: o valor deve ser maior que zero.');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(h.state.retry).toHaveBeenCalled();
  });

  it('erro com resultado anterior mantém o veredito na tela', () => {
    h.state = state({ error: 'Falhou' });
    render(<SimulatorView />);
    expect(screen.getByRole('alert').textContent).toContain('Falhou');
    expect(screen.getByRole('region', { name: 'Veredito da simulação' })).toBeTruthy();
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

describe('SimulatorView: Como calculamos guarda o saldo de partida', () => {
  it('lista as contas, as médias e as notas da API, e diz que o saldo não entra no veredito', () => {
    render(<SimulatorView />);
    expect(screen.getByText('Como calculamos')).toBeTruthy();
    expect(screen.getByText('Conta corrente')).toBeTruthy();
    expect(screen.getByText('Nota de regra A')).toBeTruthy();
    expect(screen.getByText('3 de 3')).toBeTruthy();
    expect(norm(screen.getByLabelText('Médias usadas').textContent)).toContain('R$ 4.000,00');
    expect(screen.getByText(/O saldo de partida não entra no veredito/)).toBeTruthy();
  });

  it('o saldo de partida não aparece fora do bloco', () => {
    const { container } = render(<SimulatorView />);
    const how = container.querySelector('.wi-how');
    const clone = container.cloneNode(true);
    clone.querySelector('.wi-how').remove();
    expect(norm(clone.textContent)).not.toContain('R$ 5.000,00');
    expect(norm(how.textContent)).toContain('R$ 5.000,00');
  });
});
