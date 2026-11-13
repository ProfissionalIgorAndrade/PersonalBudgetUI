/* global Response, global */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('../../../core/utils/simulatorMath', async (orig) => ({
  ...(await orig()),
  localToday: () => '2026-10-07',
}));

import WhatIfView from '../WhatIfView';

/**
 * Só o servidor é falso (fetch): o hook, o repositório e o cliente HTTP são os
 * reais, então estes testes provam que a tela nova lê e grava em /api/simulations
 * com a sessão e o lar, igual à tela antiga.
 */

const SERVER_SIMS = [
  {
    id: 'a1', description: 'Intercâmbio - Passagem', type: 'Expense', mode: 'Installment', startMonth: '2026-11',
    amount: 5500, amountKind: 'Total', installments: 6, months: null, ownerUserId: 'u1', ownerName: 'Igor', isOwner: true,
  },
  {
    id: 'b2', description: 'Compra casa nova', type: 'Expense', mode: 'Monthly', startMonth: '2026-11',
    amount: 5000, amountKind: 'PerInstallment', installments: null, months: null, ownerUserId: 'u2', ownerName: 'Andreza', isOwner: false,
  },
];

const TRANSACTIONS = ['2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03'].flatMap((ym, i) => [
  { id: `in${i}`, type: 'income', amount: 12000, date: `${ym}-05` },
  { id: `ex${i}`, type: 'expense', amount: 7000, date: `${ym}-10`, recurrence: 'fixed' },
]);

let calls;
const json = (data) => new Response(JSON.stringify({ success: true, data }), { status: 200 });

beforeEach(() => {
  calls = [];
  localStorage.clear();
  localStorage.setItem('pb_jwt', 'token-1');
  localStorage.setItem('pb_household_id', 'lar-1');
  localStorage.setItem('pb_simulator_imported:u1', '1');
  global.fetch = vi.fn(async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET', headers: opts.headers, body: opts.body ? JSON.parse(opts.body) : null });
    if ((opts.method || 'GET') === 'GET') return json(SERVER_SIMS);
    return json({ ...JSON.parse(opts.body || '{}'), id: 'new' });
  });
});
afterEach(cleanup);

const view = () => render(
  <WhatIfView transactions={TRANSACTIONS} members={[]} authSession={{ userId: 'u1' }} />,
);
const loaded = () => screen.findAllByText('Intercâmbio - Passagem');

describe('WhatIfView: dados do back-end', () => {
  it('busca as simulações em GET /api/simulations com o token e o lar', async () => {
    view();
    await loaded();
    const get = calls.find((c) => c.method === 'GET');
    expect(get.url).toMatch(/\/api\/simulations$/);
    expect(get.headers.Authorization).toBe('Bearer token-1');
    expect(get.headers['X-Household-Id']).toBe('lar-1');
    expect(screen.getAllByText('Compra casa nova').length).toBeGreaterThan(0);
  });

  it('sem sessão não faz requisição', () => {
    render(<WhatIfView transactions={TRANSACTIONS} members={[]} authSession={null} />);
    expect(calls).toHaveLength(0);
  });

  it('mostra quantas estão ligadas e um switch em cada cartão; desligar não vai ao servidor', async () => {
    view();
    await loaded();
    expect(screen.getByText(/de 2 ligadas/).textContent).toMatch(/2\s*de 2 ligadas/);
    const toggle = screen.getByRole('switch', { name: /Intercâmbio - Passagem: ligada/ });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    const before = calls.length;
    fireEvent.click(toggle);
    expect(screen.getByRole('switch', { name: /Intercâmbio - Passagem: desligada/ }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText(/de 2 ligadas/).textContent).toMatch(/1\s*de 2 ligadas/);
    expect(screen.getByText(/1 simulação desligada fica/)).toBeTruthy();
    expect(calls.length).toBe(before);
  });

  it('mostra o rostinho de quem criou, sem o nome escrito', async () => {
    view();
    await loaded();
    expect(screen.getAllByRole('img', { name: 'Criada por Andreza' }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/de Andreza/)).toBeNull();
  });

  it('troca entre ponte, linha e cascata; a cascata mostra a sobra de hoje e onde o mês fecha', async () => {
    view();
    await loaded();
    const forms = screen.getByRole('group', { name: 'Forma do gráfico' });
    expect(within(forms).getByRole('button', { name: 'Ponte' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(within(forms).getByRole('button', { name: 'Linha' }));
    expect(screen.getByText('Quando cada simulação pesa')).toBeTruthy();
    fireEvent.click(within(forms).getByRole('button', { name: 'Cascata' }));
    expect(screen.getByText('Sobra sem simulações')).toBeTruthy();
    expect(screen.getByText('Sobra com simulações')).toBeTruthy();
  });

  it('"Ver os números" abre a tabela com o cenário atual, cada simulação ligada, o impacto e a sobra final', async () => {
    view();
    await loaded();
    expect(screen.queryByRole('table')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver os números' }));
    const table = screen.getByRole('table');
    for (const name of ['Receitas lançadas', 'Despesas lançadas', 'Sobra sem simulações', 'Impacto das simulações', 'Sobra com simulações']) {
      expect(within(table).getByRole('rowheader', { name })).toBeTruthy();
    }
    expect(within(table).getByText('Intercâmbio - Passagem')).toBeTruthy();
  });

  it('a simulação de outra pessoa não abre edição', async () => {
    view();
    await loaded();
    expect(screen.queryByRole('button', { name: 'Compra casa nova' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Intercâmbio - Passagem' })).toBeTruthy();
  });

  it('"Nova simulação" abre o painel e salvar faz POST /api/simulations com o corpo da API', async () => {
    view();
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: 'Nova simulação', expanded: false }));
    const sheet = screen.getByRole('dialog', { name: 'Simular algo' });
    fireEvent.click(within(sheet).getByText('Comprar parcelado'));

    const panel = screen.getByRole('dialog', { name: 'Comprar parcelado' });
    fireEvent.change(within(panel).getByLabelText('Descrição'), { target: { value: 'Notebook' } });
    fireEvent.change(within(panel).getByLabelText('Valor total'), { target: { value: '6000' } });
    fireEvent.change(within(panel).getByLabelText('Parcelas'), { target: { value: '10' } });
    expect(screen.getByText('Rascunho')).toBeTruthy();

    fireEvent.click(within(panel).getByRole('button', { name: 'Salvar simulação' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
    const post = calls.find((c) => c.method === 'POST');
    expect(post.url).toMatch(/\/api\/simulations$/);
    expect(post.body).toEqual({
      description: 'Notebook', type: 'Expense', mode: 'Installment', startMonth: '2026-10',
      amount: 6000, amountKind: 'Total', installments: 10, months: null,
    });
    // depois de gravar, relê a lista do servidor e fecha o painel
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(calls.filter((c) => c.method === 'GET').length).toBeGreaterThan(1);
  });
});

/** Servidor com estado: POST e DELETE mudam o que o próximo GET devolve. */
function statefulServer(initial, { failDelete = false } = {}) {
  let list = initial.map((s) => ({ ...s }));
  global.fetch = vi.fn(async (url, opts = {}) => {
    const method = opts.method || 'GET';
    const body = opts.body ? JSON.parse(opts.body) : null;
    calls.push({ url, method, body });
    const id = url.split('/').pop();
    if (method === 'GET') return json(list);
    if (method === 'DELETE') {
      if (failDelete) {
        return new Response(JSON.stringify({ success: false, message: 'Simulação não pertence ao usuário.' }), { status: 400 });
      }
      list = list.filter((s) => s.id !== id);
      return json(null);
    }
    if (method === 'POST') {
      list = [...list, { ...body, id: 'novo', ownerUserId: 'u1', ownerName: 'Igor', isOwner: true }];
      return json({ id: 'novo' });
    }
    return json(null);
  });
}

describe('WhatIfView: editar e excluir pelo cartão', () => {
  it('só as simulações próprias mostram Editar e Excluir; a de outra pessoa mostra o cadeado', async () => {
    view();
    await loaded();
    expect(screen.getByRole('button', { name: 'Editar Intercâmbio - Passagem' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Excluir Intercâmbio - Passagem' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Editar Compra casa nova' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Excluir Compra casa nova' })).toBeNull();
    expect(screen.getByRole('img', { name: /Criada por Andreza; só quem criou edita/ })).toBeTruthy();
  });

  it('Editar abre o painel preenchido com a simulação', async () => {
    view();
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: 'Editar Intercâmbio - Passagem' }));
    const panel = screen.getByRole('dialog', { name: 'Editar simulação' });
    expect(within(panel).getByLabelText('Descrição').value).toBe('Intercâmbio - Passagem');
    expect(within(panel).getByLabelText('Parcelas').value).toBe('6');
  });

  it('Excluir pede confirmação com o nome; Cancelar não muda nada', async () => {
    statefulServer(SERVER_SIMS);
    view();
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Intercâmbio - Passagem' }));
    const modal = screen.getByRole('dialog', { name: 'Excluir "Intercâmbio - Passagem"?' });
    fireEvent.click(within(modal).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
    expect(screen.getAllByText('Intercâmbio - Passagem').length).toBeGreaterThan(0);
  });

  it('Excluir confirmado faz DELETE e o cartão some', async () => {
    statefulServer(SERVER_SIMS);
    view();
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Intercâmbio - Passagem' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
    expect(calls.find((c) => c.method === 'DELETE').url).toMatch(/\/api\/simulations\/a1$/);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Excluir Intercâmbio - Passagem' })).toBeNull());
    expect(screen.queryAllByText('Intercâmbio - Passagem')).toHaveLength(0);
  });

  it('se o servidor recusa a exclusão, o cartão fica e o erro aparece', async () => {
    statefulServer(SERVER_SIMS, { failDelete: true });
    view();
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Intercâmbio - Passagem' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Excluir Intercâmbio - Passagem' })).toBeTruthy();
  });
});

describe('WhatIfView: quitar parcelas do cartão', () => {
  const CARDS = [{ id: 'nu', name: 'Nubank', color: '#8a05be' }, { id: 'it', name: 'Itaú', color: '#ec7000' }];
  const inst = (id, cardId, ym, amount) => ({
    id, type: 'expense', amount, recurrence: 'installment', cardId,
    statementMonth: Number(ym.slice(5)), statementYear: Number(ym.slice(0, 4)), date: `${ym}-01`,
  });
  const TX = [
    ...TRANSACTIONS,
    inst('n1', 'nu', '2027-01', 500), inst('n2', 'nu', '2027-02', 500),
    inst('i1', 'it', '2027-01', 200), inst('i2', 'it', '2027-02', 200),
  ];
  const payoffView = () => render(
    <WhatIfView transactions={TX} members={[]} cards={CARDS} authSession={{ userId: 'u1' }} />,
  );
  const openPayoff = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Nova simulação', expanded: false }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Simular algo' })).getByText('Quitar parcelas do cartão'));
    return screen.getByRole('dialog', { name: 'Quitar parcelas do cartão' });
  };
  const norm = (s) => s.replace(/ /g, ' ');

  it('sugere dezembro e mostra a conta de todos os cartões antes de salvar', async () => {
    statefulServer(SERVER_SIMS);
    payoffView();
    await loaded();
    const panel = openPayoff();
    expect(within(panel).getByLabelText('Mês da quitação').value).toBe('2026-12');
    expect(within(panel).getByLabelText('Todos os cartões').checked).toBe(true);
    const text = norm(panel.textContent);
    expect(text).toContain('Total a pagar em dez/26: R$ 1.400,00');
    expect(text).toContain('Itaú · 2 parcelas · R$ 400,00 · jan/27 a fev/27');
    expect(text).toContain('Nubank · 2 parcelas · R$ 1.000,00 · jan/27 a fev/27');
  });

  it('desmarcar "Todos" e marcar o Itaú mostra R$ 400,00; salvar faz POST CardPayoff e o cartão aparece', async () => {
    statefulServer(SERVER_SIMS);
    payoffView();
    await loaded();
    const panel = openPayoff();
    fireEvent.click(within(panel).getByLabelText('Todos os cartões'));
    fireEvent.click(within(panel).getByLabelText('Itaú'));
    expect(norm(panel.textContent)).toContain('Total a pagar em dez/26: R$ 400,00');

    fireEvent.click(within(panel).getByRole('button', { name: 'Salvar simulação' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
    expect(calls.find((c) => c.method === 'POST').body).toEqual({
      description: 'Quitar Itaú', type: 'Expense', mode: 'CardPayoff', startMonth: '2026-12',
      amount: 0, amountKind: 'PerInstallment', installments: null, months: null, creditCardIds: ['it'],
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('button', { name: 'Editar Quitar Itaú' })).toBeTruthy();
    expect(norm(screen.getByText(/hoje, pagos em dez\/26/).textContent)).toBe('R$ 400,00 hoje, pagos em dez/26');
  });

  it('sem "Todos" e sem cartão marcado, não salva e explica', async () => {
    statefulServer(SERVER_SIMS);
    payoffView();
    await loaded();
    const panel = openPayoff();
    fireEvent.click(within(panel).getByLabelText('Todos os cartões'));
    fireEvent.click(within(panel).getByRole('button', { name: 'Salvar simulação' }));
    expect(within(panel).getByText('Escolha ao menos um cartão, ou marque "Todos os cartões".')).toBeTruthy();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('editar uma quitação salva reabre com os cartões escolhidos', async () => {
    statefulServer([
      ...SERVER_SIMS,
      {
        id: 'q1', description: 'Zerar Nubank', type: 'Expense', mode: 'CardPayoff', startMonth: '2026-12', amount: 0,
        amountKind: 'PerInstallment', installments: null, months: null, creditCardIds: ['nu'],
        ownerUserId: 'u1', ownerName: 'Igor', isOwner: true,
      },
    ]);
    payoffView();
    await loaded();
    expect(norm(screen.getByText(/hoje, pagos em dez\/26/).textContent)).toBe('R$ 1.000,00 hoje, pagos em dez/26');
    fireEvent.click(screen.getByRole('button', { name: 'Editar Zerar Nubank' }));
    const panel = screen.getByRole('dialog', { name: 'Editar simulação' });
    expect(within(panel).getByLabelText('Todos os cartões').checked).toBe(false);
    expect(within(panel).getByLabelText('Nubank').checked).toBe(true);
    expect(within(panel).getByLabelText('Itaú').checked).toBe(false);
  });
});
