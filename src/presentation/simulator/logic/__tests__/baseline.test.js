import { describe, it, expect } from 'vitest';
import { buildMonthlyBaseline } from '../baseline';
import { txBelongsToMonth } from '../../../../core/utils/billing';

/**
 * Fórmula do Dashboard (DashboardView): linhas do mês por txBelongsToMonth,
 * receita = soma das 'income', despesa = soma das 'expense', saldo = diferença.
 * É o oráculo dos testes abaixo.
 */
const dashboard = (transactions, month) => {
  const mTx = transactions.filter((t) => txBelongsToMonth(t, month));
  const totalIn = mTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = mTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  return { totalIn, totalOut, balance: totalIn - totalOut };
};
const cents = (v) => Math.round(Number((v * 100).toPrecision(15)));

const tx = (id, over) => ({ id, type: 'expense', amount: 10, date: '2026-11-10', ...over });

const FIXTURE = [
  // nov/26 por data
  tx('i1', { type: 'income', amount: '27200.00', date: '2026-11-05' }),
  tx('e1', { amount: '1.10', date: '2026-11-06', recurrence: 'fixed' }),
  tx('e2', { amount: 2.2, date: '2026-11-07' }),
  tx('e3', { amount: '0.30', date: '2026-11-08', recurrence: 'installment' }),
  // cartão: comprado em 28/10, fatura de nov/26 -> cai em nov, não em out
  tx('c1', { amount: '9000.05', date: '2026-10-28', cardId: 'card1', statementMonth: 11, statementYear: 2026 }),
  // cartão sem fatura: segue a data
  tx('c2', { amount: 5, date: '2026-11-12', cardId: 'card1', statementMonth: null, statementYear: null }),
  // cartão comprado em dez com fatura em jan/27 (virada de ano)
  tx('c3', { amount: '100.10', date: '2026-12-29', cardId: 'card1', statementMonth: 1, statementYear: 2027 }),
  // dez/26
  tx('i2', { type: 'income', amount: 27200, date: '2026-12-05' }),
  tx('e4', { amount: '11489.29', date: '2026-12-10' }),
  // estorno do cartão (income no cartão) cai na fatura de jan/27 e soma como receita, como no Dashboard
  tx('r1', { type: 'income', amount: '20.00', date: '2026-12-30', cardId: 'card1', statementMonth: 1, statementYear: 2027 }),
  // transferência e caixinha: nunca chegam em data.transactions, mas se vierem, não entram
  tx('t1', { type: 'transfer', amount: 999, date: '2026-11-15' }),
  tx('s1', { type: 'savings', amount: 888, date: '2026-12-15' }),
  // fora da janela
  tx('o1', { amount: 777, date: '2026-09-01' }),
  tx('o2', { amount: 666, date: '2027-06-01' }),
  // sem data nem fatura
  { id: 'x1', type: 'expense', amount: 5 },
  null,
];

describe('buildMonthlyBaseline: igual ao Dashboard', () => {
  const months = ['2026-10', '2026-11', '2026-12', '2027-01', '2027-02'];
  const base = buildMonthlyBaseline(FIXTURE, '2026-10', 5);

  it('receita, despesa e sobra de cada mês batem com a fórmula do Dashboard', () => {
    expect(base).toHaveLength(5);
    months.forEach((ym, i) => {
      const d = dashboard(FIXTURE.filter(Boolean), ym);
      expect(base[i].ym).toBe(ym);
      expect(cents(base[i].income)).toBe(cents(d.totalIn));
      expect(cents(base[i].expense)).toBe(cents(d.totalOut));
      expect(cents(base[i].result)).toBe(cents(d.balance));
    });
  });

  it('números à mão: compras de cartão no mês da fatura, sem transferências nem caixinhas', () => {
    const byYm = Object.fromEntries(base.map((b) => [b.ym, b]));
    expect(byYm['2026-11']).toMatchObject({ income: 27200, expense: 9008.65, result: 18191.35, hasData: true });
    expect(byYm['2026-12']).toMatchObject({ income: 27200, expense: 11489.29, result: 15710.71, hasData: true });
    expect(byYm['2027-01']).toMatchObject({ income: 20, expense: 100.1, result: -80.1, hasData: true });
  });

  it('mês sem linhas: zeros e hasData falso; mês com linhas zeradas tem dados', () => {
    expect(base[0]).toMatchObject({ income: 0, expense: 0, result: 0, hasData: false });
    expect(base[4]).toMatchObject({ income: 0, expense: 0, result: 0, hasData: false });
    const zero = buildMonthlyBaseline([tx('z', { amount: 0, date: '2026-10-01' })], '2026-10', 1);
    expect(zero[0].hasData).toBe(true);
  });

  it('fixos e parcelas x o resto da despesa (detalhe), sempre fechando com a despesa', () => {
    const nov = base[1];
    expect(nov.committed).toBe(1.4);
    expect(nov.variable).toBe(9007.25);
    base.forEach((b) => expect(cents(b.committed) + cents(b.variable)).toBe(cents(b.expense)));
  });

  it('rótulo curto e meses seguidos atravessando a virada do ano', () => {
    expect(base.map((b) => b.label)).toEqual(['out/26', 'nov/26', 'dez/26', 'jan/27', 'fev/27']);
  });
});

describe('buildMonthlyBaseline: o caso real do usuário (dez/26)', () => {
  it('receitas 27.200,00, despesas 11.489,29, saldo 15.710,71', () => {
    const rows = [
      tx('i', { type: 'income', amount: '27200.00', date: '2026-12-05' }),
      tx('a', { amount: '8000.10', date: '2026-12-06', recurrence: 'fixed' }),
      tx('b', { amount: '3000.00', date: '2026-12-07' }),
      tx('c', { amount: '489.19', date: '2026-12-08', cardId: 'k', statementMonth: 12, statementYear: 2026 }),
    ];
    const [dez] = buildMonthlyBaseline(rows, '2026-12', 1);
    expect(dez).toMatchObject({ income: 27200, expense: 11489.29, result: 15710.71 });
  });
});

describe('buildMonthlyBaseline: uma passada só', () => {
  it('lê a lista uma vez, não uma por mês', () => {
    let reads = 0;
    const rows = new Proxy(FIXTURE.filter(Boolean), {
      get(target, prop, recv) {
        if (prop === Symbol.iterator) reads += 1;
        return Reflect.get(target, prop, recv);
      },
    });
    buildMonthlyBaseline(rows, '2026-10', 24);
    expect(reads).toBe(1);
  });

  it('entradas vazias ou ausentes', () => {
    expect(buildMonthlyBaseline([], '2026-10', 2).every((b) => !b.hasData)).toBe(true);
    expect(buildMonthlyBaseline(undefined, '2026-10', 1)[0].hasData).toBe(false);
    expect(buildMonthlyBaseline([], '2026-10', 0)).toEqual([]);
  });
});
