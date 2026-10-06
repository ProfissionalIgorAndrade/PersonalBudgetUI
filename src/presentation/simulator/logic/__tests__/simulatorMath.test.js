import { describe, it, expect } from 'vitest';
import { installmentBreakdown, localToday, projectionImpacts, round2 } from '../../../../core/utils/simulatorMath';

describe('installmentBreakdown (igual ao ImpactSchedule do backend)', () => {
  it('valor por parcela', () => {
    expect(installmentBreakdown({ amount: 150, amountKind: 'PerInstallment', installments: 12 }))
      .toEqual({ count: 12, per: 150, last: 150, total: 1800 });
  });

  it('total dividido: resto na última parcela', () => {
    expect(installmentBreakdown({ amount: 1000, amountKind: 'Total', installments: 12 }))
      .toEqual({ count: 12, per: 83.33, last: 83.37, total: 1000 });
  });

  it('total que divide exato', () => {
    expect(installmentBreakdown({ amount: 1800, amountKind: 'Total', installments: 12 }))
      .toEqual({ count: 12, per: 150, last: 150, total: 1800 });
  });

  it('arredonda para cima acima do meio e para o par no meio exato', () => {
    // 0,67 / 2 = 0,335 (meio exato): par -> 0,34? q=33 (ímpar) -> 34; última = 0,67 - 0,34 = 0,33
    expect(installmentBreakdown({ amount: 0.67, amountKind: 'Total', installments: 2 }))
      .toEqual({ count: 2, per: 0.34, last: 0.33, total: 0.67 });
    // 0,65 / 2 = 0,325 (meio exato): q=32 (par) fica 32; última = 0,33
    expect(installmentBreakdown({ amount: 0.65, amountKind: 'Total', installments: 2 }))
      .toEqual({ count: 2, per: 0.32, last: 0.33, total: 0.65 });
    // 100 / 3 = 33,333...: abaixo do meio
    expect(installmentBreakdown({ amount: 100, amountKind: 'Total', installments: 3 }))
      .toEqual({ count: 3, per: 33.33, last: 33.34, total: 100 });
    // 200 / 3 = 66,666...: acima do meio
    expect(installmentBreakdown({ amount: 200, amountKind: 'Total', installments: 3 }))
      .toEqual({ count: 3, per: 66.67, last: 66.66, total: 200 });
  });

  it('entrada inválida devolve null', () => {
    expect(installmentBreakdown({ amount: 0, amountKind: 'Total', installments: 3 })).toBeNull();
    expect(installmentBreakdown({ amount: 10, amountKind: 'Total', installments: 0 })).toBeNull();
    expect(installmentBreakdown({ amount: 10, amountKind: 'Total', installments: 1.5 })).toBeNull();
  });
});

describe('helpers do pedido', () => {
  it('localToday usa a data local, não UTC', () => {
    expect(localToday(new Date(2026, 9, 6, 23, 59))).toBe('2026-10-06');
    expect(localToday(new Date(2027, 0, 1, 0, 1))).toBe('2027-01-01');
  });

  it('projectionImpacts não leva enabled e só envia campos do modo', () => {
    const sims = [
      { id: 'a', enabled: false, description: 'A', type: 'Expense', mode: 'Installment', startMonth: '2026-10', amount: 10, amountKind: 'Total', installments: 3, months: null },
      { id: 'b', enabled: true, description: 'B', type: 'Income', mode: 'Monthly', startMonth: '2026-10', amount: 10, amountKind: 'Total', installments: null, months: null },
      { id: 'c', enabled: true, description: 'C', type: 'Income', mode: 'Monthly', startMonth: '2026-10', amount: 10, amountKind: 'PerInstallment', installments: null, months: 6 },
      { id: 'd', enabled: true, description: 'D', type: 'Income', mode: 'Single', startMonth: '2026-10', amount: 10, amountKind: 'Total', installments: null, months: null },
    ];
    const [a, b, c, d] = projectionImpacts(sims);
    expect(a).toEqual({ id: 'a', description: 'A', type: 'Expense', mode: 'Installment', startMonth: '2026-10', amount: 10, amountKind: 'Total', installments: 3 });
    expect('months' in b).toBe(false);
    expect(b.amountKind).toBe('PerInstallment');
    expect(c.months).toBe(6);
    expect('installments' in d).toBe(false);
    expect('enabled' in a).toBe(false);
  });

  it('round2', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(10)).toBe(10);
  });
});
