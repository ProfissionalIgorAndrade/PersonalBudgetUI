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

  it('mostra quantas estão ligadas e o estado escrito em cada uma; desligar não vai ao servidor', async () => {
    view();
    await loaded();
    expect(screen.getByText(/de 2 ligadas/).textContent).toMatch(/2\s*de 2 ligadas/);
    const toggle = screen.getByRole('switch', { name: /Intercâmbio - Passagem: ligada/ });
    expect(toggle.textContent).toBe('Ligada');
    const before = calls.length;
    fireEvent.click(toggle);
    expect(screen.getByRole('switch', { name: /Intercâmbio - Passagem: desligada/ }).textContent).toBe('Desligada');
    expect(screen.getByText(/de 2 ligadas/).textContent).toMatch(/1\s*de 2 ligadas/);
    expect(calls.length).toBe(before);
  });

  it('a simulação de outra pessoa não abre edição', async () => {
    view();
    await loaded();
    expect(screen.queryByRole('button', { name: 'Compra casa nova' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Intercâmbio - Passagem' })).toBeTruthy();
  });

  it('"Simular algo" abre o painel e salvar faz POST /api/simulations com o corpo da API', async () => {
    view();
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: 'Simular algo', expanded: false }));
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
