import { describe, it, expect } from 'vitest';
import { buildSchedules } from '../schedule';
import { buildPayoffSchedule, payoffDefaultName } from '../payoff';
import { composeMonthly } from '../compose';
import { buildMonthlyBaseline } from '../baseline';

/**
 * Exemplo do pedido: hoje = nov/26, 6 meses (nov/26 a abr/27).
 *
 * | Cartão | dez/26 | jan/27 | fev/27 | mar/27 |
 * | Nubank | 500    | 500    | 500    | 300    |
 * | Itaú   | —      | 200    | 200    | —      |
 */
const CARDS = [{ id: 'nu', name: 'Nubank' }, { id: 'it', name: 'Itaú' }];

let seq = 0;
const inst = (cardId, ym, amount, type = 'expense', extra = {}) => {
  const [y, m] = ym.split('-').map(Number);
  seq += 1;
  return {
    id: `t${seq}`, type, amount, recurrence: 'installment', cardId,
    statementMonth: m, statementYear: y, date: `${ym}-01`, ...extra,
  };
};

const BASE_TX = [
  inst('nu', '2026-12', 500), inst('nu', '2027-01', 500), inst('nu', '2027-02', 500), inst('nu', '2027-03', 300),
  inst('it', '2027-01', 200), inst('it', '2027-02', 200),
  // Não são parcelas: à vista e assinatura no cartão ficam de fora.
  { ...inst('nu', '2027-01', 999), recurrence: 'variable' },
  { ...inst('nu', '2027-01', 50), recurrence: 'fixed' },
  // Parcela fora de cartão (conta): fora.
  { ...inst('', '2027-01', 777), statementMonth: null, statementYear: null },
];

const ctx = (transactions = BASE_TX, cards = CARDS) => ({ transactions, cards });
const payoff = (over = {}) => ({
  id: 'p1', description: '', type: 'Expense', mode: 'CardPayoff', startMonth: '2026-12',
  creditCardIds: null, enabled: true, ...over,
});

describe('quitação de parcelas: exemplo do pedido', () => {
  it('todos os cartões em dez/26: −1.700 em dez, alívio de 700, 700 e 300, zero no período', () => {
    const s = buildPayoffSchedule(payoff(), '2026-11', 6, ctx());
    expect(s.monthly).toEqual([0, -1700, 700, 700, 300, 0]);
    expect(s.payoff.total).toBe(1700);
    expect(s.totalInHorizon).toBe(0);
    expect(s.payoff.afterWindow).toBe(0);
    expect(s.payoff.count).toBe(5);
    expect(s.payoff.cards).toEqual([
      { cardId: 'it', name: 'Itaú', count: 2, amount: 400, firstMonth: '2027-01', lastMonth: '2027-02' },
      { cardId: 'nu', name: 'Nubank', count: 3, amount: 1300, firstMonth: '2027-01', lastMonth: '2027-03' },
    ]);
    expect(s.warnings).toEqual([]);
  });

  it('a fatura do próprio mês (dez/26) não entra: já é paga normalmente', () => {
    const s = buildPayoffSchedule(payoff(), '2026-11', 6, ctx());
    expect(s.payoff.cards.find((c) => c.cardId === 'nu').firstMonth).toBe('2027-01');
  });

  it('só o Itaú em dez/26: −400 em dez, +200 em jan e fev', () => {
    const s = buildPayoffSchedule(payoff({ creditCardIds: ['it'] }), '2026-11', 6, ctx());
    expect(s.monthly).toEqual([0, -400, 200, 200, 0, 0]);
    expect(s.payoff.total).toBe(400);
  });

  it('horizonte de 3 meses: −1.700 em dez, +700 em jan, −1.000 no período e R$ 1.000 de alívio depois', () => {
    const s = buildPayoffSchedule(payoff(), '2026-11', 3, ctx());
    expect(s.monthly).toEqual([0, -1700, 700]);
    expect(s.totalInHorizon).toBe(-1000);
    expect(s.payoff.afterWindow).toBe(1000);
    expect(s.warnings).toHaveLength(1);
    expect(s.warnings[0].code).toBe('AfterWindow');
    expect(s.warnings[0].message).toMatch(/1\.000,00 de alívio depois de jan\/27/);
  });

  it('entra no compose como qualquer simulação: a sobra muda só nos meses certos', () => {
    const tx = [
      ...BASE_TX,
      ...['2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04'].map((ym, i) => ({
        id: `sal${i}`, type: 'income', amount: 5000, date: `${ym}-05`,
      })),
    ];
    const baseline = buildMonthlyBaseline(tx, '2026-11', 6);
    const schedules = buildSchedules([payoff()], '2026-11', 6, ctx(tx));
    const composed = composeMonthly({ baseline, schedules, enabledIds: ['p1'] });
    expect(composed.totals.result).toBe(baseline.reduce((a, m) => a + m.result, 0));
  });
});

describe('quitação de parcelas: casos de borda', () => {
  it('1. sem parcelas futuras: efeito zero e aviso', () => {
    const s = buildPayoffSchedule(payoff({ creditCardIds: ['it'], startMonth: '2027-03' }), '2026-11', 6, ctx());
    expect(s.monthly).toEqual([0, 0, 0, 0, 0, 0]);
    expect(s.payoff.total).toBe(0);
    expect(s.warnings.map((w) => w.code)).toEqual(['Empty']);
    expect(s.warnings[0].message).toBe('Nenhuma parcela de cartão a quitar depois de mar/27.');
  });

  it('2. estorno parcelado reduz o valor da quitação', () => {
    const tx = [...BASE_TX, inst('nu', '2027-02', 100, 'income')];
    const s = buildPayoffSchedule(payoff(), '2026-11', 6, ctx(tx));
    expect(s.payoff.total).toBe(1600);
    expect(s.monthly).toEqual([0, -1600, 700, 600, 300, 0]);
    expect(s.payoff.cards.find((c) => c.cardId === 'nu')).toMatchObject({ count: 3, amount: 1200 });
  });

  it('3. "todos" inclui um cartão criado depois da simulação', () => {
    const cards = [...CARDS, { id: 'novo', name: 'Inter' }];
    const tx = [...BASE_TX, inst('novo', '2027-01', 90)];
    const s = buildPayoffSchedule(payoff(), '2026-11', 6, ctx(tx, cards));
    expect(s.payoff.total).toBe(1790);
  });

  it('4. duas quitações ligadas não contam a mesma parcela duas vezes; desligar a primeira passa as parcelas à segunda', () => {
    const a = payoff({ id: 'a', creditCardIds: ['nu'], startMonth: '2026-12' });
    const b = payoff({ id: 'b', creditCardIds: null, startMonth: '2027-01' });

    // B vem antes na lista, mas A quita mais cedo: A fica com as parcelas do Nubank.
    const [sb, sa] = buildSchedules([b, a], '2026-11', 6, ctx());
    expect(sa.payoff.total).toBe(1300);
    expect(sb.payoff.total).toBe(200);   // só o Itaú de fev/27

    const [sb2, sa2] = buildSchedules([b, { ...a, enabled: false }], '2026-11', 6, ctx());
    expect(sa2.payoff.total).toBe(1300); // desligada continua mostrando o próprio valor
    expect(sb2.payoff.total).toBe(1000); // Nubank fev+mar (800) + Itaú fev (200)
  });

  it('4b. empate no mês: a que vem antes na lista (criada primeiro) fica com as parcelas', () => {
    const first = payoff({ id: 'first' });
    const second = payoff({ id: 'second' });
    const [s1, s2] = buildSchedules([first, second], '2026-11', 6, ctx());
    expect(s1.payoff.total).toBe(1700);
    expect(s2.payoff.total).toBe(0);
  });

  it('5. centavos somam sem erro de ponto flutuante (3 × 33,33)', () => {
    const tx = [inst('nu', '2027-01', 33.33), inst('nu', '2027-02', 33.33), inst('nu', '2027-03', 33.33)];
    const s = buildPayoffSchedule(payoff(), '2026-11', 6, ctx(tx));
    expect(s.payoff.total).toBe(99.99);
    expect(s.monthly[1]).toBe(-99.99);
  });

  it('6. cartão escolhido que não existe mais fica de fora, com aviso', () => {
    const tx = [...BASE_TX, inst('gone', '2027-01', 80)];
    const s = buildPayoffSchedule(payoff({ creditCardIds: ['nu', 'gone'] }), '2026-11', 6, ctx(tx));
    expect(s.payoff.total).toBe(1300);
    expect(s.warnings.map((w) => w.code)).toEqual(['MissingCard']);
  });

  it('quitação antes do período: só o alívio entra, com aviso', () => {
    const s = buildPayoffSchedule(payoff({ startMonth: '2026-10' }), '2026-11', 6, ctx());
    expect(s.monthly).toEqual([0, 500, 700, 700, 300, 0]);
    expect(s.warnings.map((w) => w.code)).toEqual(['Truncated']);
  });

  it('as outras simulações seguem calculadas como antes', () => {
    const single = {
      id: 's', description: 'Geladeira', type: 'Expense', mode: 'Single', startMonth: '2026-12', amount: 3000,
    };
    const [s] = buildSchedules([single], '2026-11', 3, ctx());
    expect(s.monthly).toEqual([0, -3000, 0]);
    expect(s.payoff).toBeUndefined();
  });
});

describe('payoffDefaultName', () => {
  it('nomeia pela escolha de cartões', () => {
    expect(payoffDefaultName(null, CARDS)).toBe('Quitar todos os cartões');
    expect(payoffDefaultName(['nu', 'it'], CARDS)).toBe('Quitar Nubank, Itaú');
    expect(payoffDefaultName(['gone'], CARDS)).toBe('Quitar cartões');
  });
});
