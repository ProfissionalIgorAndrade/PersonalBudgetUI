import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { SIMS } from '../logic/__tests__/fixtures';

const h = vi.hoisted(() => ({ state: {}, args: [] }));
vi.mock('../../../application/hooks/useSimulator', () => ({
  HORIZONS: [1, 3, 6, 12, 24],
  useSimulator: (...args) => { h.args.push(args); return h.state; },
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

const OWNED = SIMS.map((s) => ({ ...s, ownerUserId: 'u1', ownerName: 'Igor', isOwner: true }));
const state = (over = {}) => ({
  simulations: OWNED, months: 6, setMonths: vi.fn(),
  loading: false, error: '', retry: vi.fn(), saving: false, actionError: '', dismissActionError: vi.fn(),
  addSimulation: vi.fn(), editSimulation: vi.fn(), removeSimulation: vi.fn(), removeMine: vi.fn(),
  toggleSimulation: vi.fn(), limitReached: false, ownedCount: OWNED.length,
  legacyCount: 0, importing: false, importError: '', importLegacy: vi.fn(), dismissImport: vi.fn(), ...over,
});

beforeEach(() => { h.args = []; h.state = state(); });

const norm = (s) => s.replace(/ /g, ' ');
const verdictText = () => norm(screen.getByRole('region', { name: 'Veredito da simulação' }).textContent);
const withOff = (...ids) => OWNED.map((s) => (ids.includes(s.id) ? { ...s, enabled: false } : s));
const view = (props = {}) => render(<SimulatorView transactions={TRANSACTIONS} {...props} />);

describe('SimulatorView: uma página', () => {
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

  it('carregada e sem erro: renderiza direto, sem alertas nem avisos de carregamento', () => {
    view();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByText(/Carregando|Tentar de novo/)).toBeNull();
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
    h.state = state({ simulations: OWNED.map((s) => ({ ...s, enabled: false })) });
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
    h.state = state({ simulations: OWNED.map((s) => (s.id === 'trip' ? { ...s, description: '' } : s)) });
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
  it('sem simulações: veredito só da base, convite para adicionar e remover minhas desabilitado', () => {
    h.state = state({ simulations: [], ownedCount: 0 });
    view();
    expect(screen.getByText(/Nenhuma simulação ainda/)).toBeTruthy();
    expect(verdictText()).not.toContain('sem simulações');
    expect(verdictText()).toContain('Adicione uma compra, renda ou gasto');
    expect(screen.getByRole('button', { name: 'Remover minhas simulações' }).disabled).toBe(true);
  });
});

describe('SimulatorView: Remover minhas simulações pede confirmação', () => {
  const open = () => fireEvent.click(screen.getByRole('button', { name: 'Remover minhas simulações' }));

  it('cancelar não remove; confirmar chama removeMine e fecha', () => {
    view();
    open();
    expect(screen.getByText('Remover minhas simulações?')).toBeTruthy();
    expect(h.state.removeMine).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(h.state.removeMine).not.toHaveBeenCalled();
    expect(screen.queryByText('Remover minhas simulações?')).toBeNull();

    open();
    const dialog = screen.getByText('Remover minhas simulações?').closest('.modal');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remover minhas simulações' }));
    expect(h.state.removeMine).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Remover minhas simulações?')).toBeNull();
  });

  it('o texto diz que só as suas saem e as da família ficam, sem "neste navegador"', () => {
    view();
    open();
    const text = norm(screen.getByText(/Isso apaga/).textContent);
    expect(text).toContain('as 4 simulações que você criou');
    expect(text).toContain('dos outros membros da família continuam como estão');
    expect(text).not.toContain('navegador');
  });

  it('conta só as minhas e fica desabilitado quando não tenho nenhuma ou está salvando', () => {
    h.state = state({ simulations: OWNED.map((s, i) => (i ? { ...s, isOwner: false } : s)), ownedCount: 1 });
    view();
    open();
    expect(screen.getByText(/Isso apaga/).textContent).toContain('a 1 simulação que você criou');
    cleanup();
    h.state = state({ ownedCount: 0 });
    view();
    expect(screen.getByRole('button', { name: 'Remover minhas simulações' }).disabled).toBe(true);
    cleanup();
    h.state = state({ saving: true });
    view();
    expect(screen.getByRole('button', { name: 'Remover minhas simulações' }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: '+ Nova simulação' }).disabled).toBe(true);
  });
});

describe('SimulatorView: compartilhada com a família', () => {
  const MEMBERS = [{ id: 'p2', name: 'Andreza', emoji: '👩', color: '#aa3366', userId: 'u2' }];

  it('o subtítulo diz que as simulações são compartilhadas', () => {
    view();
    expect(screen.getByText(/As simulações são compartilhadas com a família\./)).toBeTruthy();
  });

  it('passa o usuário da sessão para o hook', () => {
    view({ authSession: { userId: 'u1', displayName: 'Igor', email: 'i@x' }, members: MEMBERS });
    expect(h.args[0][0]).toEqual({ userId: 'u1' });
  });

  it('mostra o dono de cada cartão e esconde editar/remover das de outra pessoa', () => {
    h.state = state({
      simulations: OWNED.map((s) => (s.id === 'trip' ? { ...s, ownerUserId: 'u2', ownerName: 'Andreza', isOwner: false } : s)),
      ownedCount: 3,
    });
    view({ members: MEMBERS });
    expect(norm(screen.getByRole('list', { name: 'Simulações' }).textContent)).toContain('de Andreza');
    expect(screen.queryByRole('button', { name: 'Editar Viagem' })).toBeNull();
    expect(screen.getByRole('img', { name: 'Criada por Andreza' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Editar Carro' })).toBeTruthy();
  });
});

describe('SimulatorView: carregamento, erro e falha ao salvar', () => {
  it('carregando: mostra o status e não mostra falso vazio nem veredito', () => {
    h.state = state({ simulations: [], loading: true, ownedCount: 0 });
    view();
    expect(screen.getByRole('status').textContent).toContain('Carregando simulações');
    expect(screen.queryByText(/Nenhuma simulação ainda/)).toBeNull();
    expect(screen.queryByRole('region', { name: 'Veredito da simulação' })).toBeNull();
    expect(screen.getByRole('button', { name: '+ Nova simulação' }).disabled).toBe(true);
  });

  it('erro de carga: alerta com Tentar de novo chamando retry', () => {
    h.state = state({ simulations: [], error: 'Falha de rede', ownedCount: 0 });
    view();
    expect(screen.getByRole('alert').textContent).toContain('Falha de rede');
    expect(screen.queryByText(/Nenhuma simulação ainda/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(h.state.retry).toHaveBeenCalledTimes(1);
  });

  it('falha ao salvar fora do formulário aparece como alerta e pode ser fechada', () => {
    h.state = state({ actionError: 'Só quem criou a simulação pode alterá-la ou removê-la.' });
    view();
    expect(screen.getByRole('alert').textContent).toContain('Só quem criou');
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(h.state.dismissActionError).toHaveBeenCalled();
  });

  it('editar chama editSimulation e o formulário mostra o erro do servidor sem duplicar o alerta', () => {
    h.state = state({ actionError: 'Simulação 1 (Carro): valor inválido.' });
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Editar Carro' }));
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert').textContent).toContain('valor inválido');
  });
});

describe('SimulatorView: importação das simulações do navegador', () => {
  it('sem simulações guardadas, não há modal', () => {
    view();
    expect(screen.queryByText(/Encontramos/)).toBeNull();
  });

  it('pergunta com a contagem e Enviar chama importLegacy', () => {
    h.state = state({ legacyCount: 3 });
    view();
    expect(screen.getByText(/Encontramos 3 simulações salvas neste navegador\./).textContent).toContain('Enviar para a família?');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(h.state.importLegacy).toHaveBeenCalledTimes(1);
    expect(h.state.dismissImport).not.toHaveBeenCalled();
  });

  it('singular e Agora não chama dismissImport', () => {
    h.state = state({ legacyCount: 1 });
    view();
    expect(screen.getByText(/Encontramos 1 simulação salva neste navegador/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
    expect(h.state.dismissImport).toHaveBeenCalledTimes(1);
    expect(h.state.importLegacy).not.toHaveBeenCalled();
  });

  it('falha mostra o erro no modal; enviando, os botões ficam desabilitados', () => {
    h.state = state({ legacyCount: 2, importError: 'Limite de simulações atingido.' });
    view();
    expect(within(screen.getByText(/Encontramos/).closest('.modal')).getByRole('alert').textContent).toContain('Limite');
    cleanup();
    h.state = state({ legacyCount: 2, importing: true });
    view();
    expect(screen.getByRole('button', { name: 'Enviando...' }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Agora não' }).disabled).toBe(true);
  });

  it('não aparece enquanto carrega', () => {
    h.state = state({ legacyCount: 2, loading: true, simulations: [] });
    view();
    expect(screen.queryByText(/Encontramos/)).toBeNull();
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
