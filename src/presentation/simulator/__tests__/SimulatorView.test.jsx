import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { SIMS } from '../logic/__tests__/fixtures';

const h = vi.hoisted(() => ({ state: {} }));
vi.mock('../../../application/hooks/useSimulator', () => ({
  HORIZONS: [1, 3, 6, 12, 24],
  useSimulator: () => h.state,
}));
vi.mock('../../../core/utils/simulatorMath', async (orig) => ({
  ...(await orig()),
  localToday: () => '2026-10-07',
}));

import SimulatorView from '../SimulatorView';

afterEach(cleanup);

const tx = (id, over) => ({ id, type: 'expense', amount: 0, date: '2026-10-10', ...over });
/**
 * Lançamentos que reproduzem a base do fixture (out/26 a mar/27, receita 4.000,00
 * por mês), incluindo uma compra de cartão cuja fatura cai em outro mês.
 */
const TRANSACTIONS = [
  ...['2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03'].map((ym, i) => tx(`in${i}`, { type: 'income', amount: 4000, date: `${ym}-05` })),
  tx('o', { amount: '3400.00', date: '2026-10-10', recurrence: 'fixed' }),
  tx('n', { amount: '3400.75', date: '2026-11-10' }),
  tx('d', { amount: '2500.75', date: '2026-12-10' }),
  tx('dcard', { amount: '1200.00', date: '2026-11-28', cardId: 'k', statementMonth: 12, statementYear: 2026 }),
  tx('j', { amount: '4700.25', date: '2027-01-10' }),
  tx('f', { amount: '3400.75', date: '2027-02-10' }),
  tx('m', { amount: '3400.75', date: '2027-03-10' }),
  tx('tr', { type: 'transfer', amount: 5000, date: '2026-11-10' }),
];

const state = (over = {}) => ({
  simulations: SIMS, months: 6, setMonths: vi.fn(),
  addSimulation: vi.fn(), editSimulation: vi.fn(), removeSimulation: vi.fn(),
  toggleSimulation: vi.fn(), reset: vi.fn(), limitReached: false, ...over,
});

beforeEach(() => { h.state = state(); });

const norm = (s) => s.replace(/ /g, ' ');
const verdictText = () => norm(screen.getByRole('region', { name: 'Veredito da simulação' }).textContent);
const withOff = (...ids) => SIMS.map((s) => (ids.includes(s.id) ? { ...s, enabled: false } : s));
const view = (props = {}) => render(<SimulatorView transactions={TRANSACTIONS} {...props} />);

describe('SimulatorView: uma página, sem rede', () => {
  it('título, horizontes 1, 3, 6, 12 e 24, e a ordem: veredito, simulações, mês a mês, como calculamos', () => {
    const { container } = view();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('E se...?');
    const seg = screen.getByRole('group', { name: 'Horizonte da projeção' });
    expect(within(seg).getAllByRole('button').map((b) => b.textContent)).toEqual(['1 mês', '3 meses', '6 meses', '12 meses', '24 meses']);
    expect(within(seg).getByText('6 meses').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(within(seg).getByText('12 meses'));
    expect(h.state.setMonths).toHaveBeenCalledWith(12);

    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByText(/Saldo hoje/)).toBeNull();

    const nodes = [
      screen.getByRole('region', { name: 'Veredito da simulação' }),
      screen.getByRole('heading', { name: 'Simulações' }),
      screen.getByRole('heading', { name: 'Mês a mês' }),
      container.querySelector('.wi-how'),
    ];
    for (let i = 0; i < nodes.length - 1; i++) {
      expect(nodes[i].compareDocumentPosition(nodes[i + 1]) & 4).toBeTruthy();
    }
  });

  it('sem estados de carregamento ou erro: renderiza direto, sem alertas nem "Calculando"', () => {
    view();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(/Calculando|Atualizando|Tentar de novo/)).toBeNull();
    expect(screen.getByRole('region', { name: 'Veredito da simulação' })).toBeTruthy();
  });

  it('o primeiro mês é o mês atual (data local) e a base é a do Dashboard', () => {
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Tabela' }));
    const rows = screen.getAllByRole('row');
    expect(norm(rows[1].textContent)).toContain('out/26');
    // dez/26: despesa 2.500,75 por data + 1.200,00 de cartão (fatura de dez) = 3.700,75; a transferência não entra
    expect(norm(rows[3].textContent)).toContain('dez/26');
    expect(norm(rows[3].textContent)).toContain('−R$ 3.700,75');
    expect(norm(rows[2].textContent)).toContain('−R$ 3.400,75');
  });

  it('o veredito de 6 meses com tudo ligado é crítico e cita o primeiro mês negativo', () => {
    view();
    const t = verdictText();
    expect(t).toContain('Crítico');
    expect(t).toContain('Nos próximos 6 meses: falta total de R$ 436,57 (sem simulações: R$ 1.996,75).');
    expect(t).toContain('1 mês fica negativo; o primeiro é jan/27.');
  });

  it('o horizonte de 1 mês usa a frase do mês', () => {
    h.state = state({ months: 1 });
    view();
    expect(verdictText()).toContain('Em out/26 o mês fecha com sobra de R$ 450,00 (sem simulações: R$ 600,00).');
    expect(screen.queryByText('Total do período')).toBeNull();
  });
});

describe('SimulatorView: liga/desliga recompõe no cliente', () => {
  it('desligar a viagem tira o mês negativo e muda o veredito para atenção', () => {
    h.state = state({ simulations: withOff('trip') });
    view();
    const t = verdictText();
    expect(t).toContain('Atenção');
    expect(t).toContain('Todos os meses seguem positivos; o mais apertado é jan/27, com R$ 266,42 de sobra.');
  });

  it('o interruptor do cartão chama só toggleSimulation', () => {
    view();
    fireEvent.click(screen.getByRole('switch', { name: 'Desligar Viagem' }));
    expect(h.state.toggleSimulation).toHaveBeenCalledWith('trip');
    expect(h.state.setMonths).not.toHaveBeenCalled();
  });

  it('outra lista de ligadas, mesmos lançamentos: o resultado vem do cliente', () => {
    const first = view();
    expect(verdictText()).toContain('Crítico');
    first.unmount();
    h.state = state({ simulations: withOff('trip', 'car', 'phone') });   // só Freela
    view();
    expect(verdictText()).toContain('Tudo certo');
    expect(verdictText()).toContain('o mais apertado é jan/27, com R$ 499,75 de sobra.');
  });

  it('todas desligadas: sem comparação com a base e com convite para ligar/adicionar', () => {
    h.state = state({ simulations: SIMS.map((s) => ({ ...s, enabled: false })) });
    view();
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
    const { container } = view();
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
    view();
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
    const { container } = view();
    expect(container.querySelectorAll('.wi-mc-seg.wi-cat-2')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Tabela' }));
    expect(screen.queryByRole('columnheader', { name: 'Celular' })).toBeNull();
    expect(screen.getByRole('columnheader', { name: 'Carro' })).toBeTruthy();
  });
});

describe('SimulatorView: meses sem lançamentos', () => {
  const partial = TRANSACTIONS.filter((t) => !['2027-02', '2027-03'].some((ym) => t.date.startsWith(ym)));

  it('ficam de fora do veredito, que diz quantos; a tabela os mostra como "Sem lançamentos"', () => {
    h.state = state({ simulations: [] });
    view({ transactions: partial });
    expect(verdictText()).toContain('2 meses sem lançamentos não entram na conta.');
    fireEvent.click(screen.getByRole('button', { name: 'Tabela' }));
    const rows = screen.getAllByRole('row');
    expect(norm(rows[5].textContent)).toContain('fev/27');
    expect(norm(rows[5].textContent)).toContain('Sem lançamentos');
    expect(norm(rows[7].textContent)).toContain('Total do período');
  });

  it('nenhum lançamento: o mês a mês explica em vez de desenhar zeros', () => {
    h.state = state({ simulations: [] });
    const { container } = view({ transactions: [] });
    expect(verdictText()).toContain('Sem dados');
    expect(screen.getByText(/Nenhum mês do período tem lançamentos, não há mês para comparar/)).toBeTruthy();
    expect(container.querySelector('.wi-hit')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tabela' })).toBeNull();
  });

  it('sem a prop transactions, a tela abre com a lista vazia', () => {
    h.state = state({ simulations: [] });
    render(<SimulatorView />);
    expect(verdictText()).toContain('Sem dados');
  });
});

describe('SimulatorView: cartões das simulações', () => {
  it('um cartão por simulação, com parcela legível e aviso só no cartão certo', () => {
    view();
    const cards = within(screen.getByRole('list', { name: 'Simulações' })).getAllByRole('listitem');
    expect(cards).toHaveLength(4);
    expect(norm(cards[0].textContent)).toContain('R$ 150,00/mês de out/26 a set/27');
    expect(norm(cards[0].textContent)).toContain('No período: −R$ 900,00');
    expect(cards[1].textContent).toContain('Continua após o período');
    expect(cards[0].textContent).toContain('Continua após o período');   // 12 parcelas, 6 no horizonte
    expect(cards[3].textContent).not.toContain('Continua após o período');
  });

  it('descrição vazia vira "Simulação N" e é usada no interruptor', () => {
    h.state = state({ simulations: SIMS.map((s) => (s.id === 'trip' ? { ...s, description: '' } : s)) });
    view();
    expect(screen.getByRole('switch', { name: 'Desligar Simulação 4' })).toBeTruthy();
  });

  it('editar e adicionar abrem o formulário; remover chama removeSimulation', () => {
    view();
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

describe('SimulatorView: estado vazio de simulações', () => {
  it('sem simulações: veredito só da base, convite para adicionar e Limpar desabilitado', () => {
    h.state = state({ simulations: [] });
    view();
    expect(screen.getByText(/Nenhuma simulação ainda/)).toBeTruthy();
    expect(verdictText()).not.toContain('sem simulações');
    expect(verdictText()).toContain('Adicione uma compra, renda ou gasto');
    expect(screen.getByRole('button', { name: 'Limpar' }).disabled).toBe(true);
  });
});

describe('SimulatorView: Limpar pede confirmação', () => {
  it('cancelar não limpa; confirmar limpa e fecha', () => {
    view();
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
  it('diz que a base é a do Dashboard, sem saldo de partida, médias nem servidor', () => {
    const { container } = view();
    expect(screen.getByText('Como calculamos')).toBeTruthy();
    const how = norm(container.querySelector('.wi-how').textContent);
    expect(how).toContain('exatamente as do Dashboard');
    expect(how).toContain('Meses sem lançamentos não entram no veredito.');
    expect(how).not.toMatch(/saldo de partida|média|servidor|estimativa/i);
  });
});
