import { describe, it, expect } from 'vitest';
import { composeScenario } from '../compose';
import { installmentBreakdown, localToday, projectionImpacts, round2 } from '../../../../core/utils/simulatorMath';
import { baseline, impacts, opening, scenarioAll, summaryAll, ALL_IDS } from './fixtures';

const compose = (enabledIds, over = {}) =>
  composeScenario({ baseline, impacts, openingBalance: opening.amount, enabledIds, ...over });

describe('composeScenario: tudo ligado reproduz o backend', () => {
  it('meses (receita, despesa, resultado, saldo, delta) iguais ao scenario[] da API', () => {
    expect(compose(ALL_IDS).months).toEqual(scenarioAll);
  });

  it('resumo igual ao summary da API', () => {
    expect(compose(ALL_IDS).summary).toEqual(summaryAll);
  });

  it('"Todas juntas": vetor assinado e totais', () => {
    const { all } = compose(ALL_IDS);
    expect(all.monthly).toEqual([-150, -150, 966.67, -5033.33, 966.67, 966.67]);
    expect(all.totalInHorizon).toBe(-2433.32);
    expect(all.totalFull).toBe(-4000);
    expect(all.count).toBe(4);
  });

  it('saldo final do cenário menos o do baseline = total no horizonte', () => {
    const { summary } = compose(ALL_IDS);
    expect(Math.round((summary.endBalanceScenario - summary.endBalanceBaseline) * 100)).toBe(Math.round(summary.totalImpactInHorizon * 100));
  });
});

describe('composeScenario: liga/desliga', () => {
  it('sem nenhuma ligada, o cenário é o baseline', () => {
    const c = compose([]);
    expect(c.months.map(m => m.balance)).toEqual(baseline.map(b => b.balance));
    expect(c.months.map(m => m.delta)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(c.summary.scenarioMinBalance).toEqual(c.summary.baselineMinBalance);
    expect(c.summary.firstNegativeMonthIndexScenario).toBeNull();
    expect(c.all.count).toBe(0);
  });

  it('desligar a viagem tira o mês negativo e recalcula saldo e menor saldo', () => {
    const c = compose(['car', 'phone', 'salary']);
    expect(c.months.map(m => m.balance)).toEqual([3250, 3699.25, 4965.17, 5231.59, 6797.51, 8363.43]);
    expect(c.summary.firstNegativeMonthIndexScenario).toBeNull();
    expect(c.summary.scenarioMinBalance).toEqual({ amount: 3250, monthIndex: 0 });
    expect(c.summary.totalImpactInHorizon).toBe(3566.68);
    expect(c.summary.totalImpactFull).toBe(2000);
  });

  it('ids desconhecidos são ignorados', () => {
    expect(compose(['nao-existe']).summary).toEqual(compose([]).summary);
  });
});

describe('composeScenario: parcelas, mensal e mês negativo', () => {
  it('12x vista em 6 meses: horizonte conta 6 parcelas, total completo as 12', () => {
    const c = compose(['car']);
    expect(c.summary.totalImpactInHorizon).toBe(-900);
    expect(c.summary.totalImpactFull).toBe(-1800);
    expect(c.months.map(m => m.simulatedExpense)).toEqual([150, 150, 150, 150, 150, 150]);
  });

  it('parcela com resto na última fica fora do horizonte e entra no total completo', () => {
    const c = compose(['phone']);
    expect(c.summary.totalImpactInHorizon).toBe(-333.32);
    expect(c.summary.totalImpactFull).toBe(-1000);
    expect(c.months[2].simulatedExpense).toBe(83.33);
  });

  it('receita mensal vira receita simulada a partir do mês de início', () => {
    const c = compose(['salary']);
    expect(c.months.map(m => m.simulatedIncome)).toEqual([0, 0, 1200, 1200, 1200, 1200]);
    expect(c.months.map(m => m.simulatedExpense)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(c.months[5].delta).toBe(4800);
  });

  it('mês negativo: primeiro negativo e menor saldo apontam o índice certo', () => {
    const c = compose(['trip']);
    expect(c.months.map(m => m.balance)).toEqual([3400, 3999.25, 4298.5, -2401.75, -1802.5, -1203.25]);
    expect(c.summary.firstNegativeMonthIndexScenario).toBe(3);
    expect(c.summary.scenarioMinBalance).toEqual({ amount: -2401.75, monthIndex: 3 });
    expect(c.summary.firstNegativeMonthIndexBaseline).toBeNull();
  });

  it('empate no menor saldo fica com o mês mais cedo', () => {
    const flat = [
      { year: 2026, month: 10, label: 'out/26', income: 0, committed: 0, variable: 0, result: 0, balance: 100 },
      { year: 2026, month: 11, label: 'nov/26', income: 0, committed: 0, variable: 0, result: 0, balance: 100 },
    ];
    const c = composeScenario({ baseline: flat, impacts: [], openingBalance: 100, enabledIds: [] });
    expect(c.summary.scenarioMinBalance).toEqual({ amount: 100, monthIndex: 0 });
  });
});

describe('composeScenario: horizonte 1', () => {
  const one = composeScenario({
    baseline: baseline.slice(0, 1),
    impacts: [{ ...impacts[0], monthly: [-150], totalInHorizon: -150, installmentsInHorizon: 1 }],
    openingBalance: 5000,
    enabledIds: ['car'],
  });

  it('um mês só', () => {
    expect(one.months).toEqual([scenarioAll[0]]);
    expect(one.summary.scenarioMinBalance).toEqual({ amount: 3250, monthIndex: 0 });
    expect(one.summary.endBalanceBaseline).toBe(3400);
    expect(one.summary.endBalanceScenario).toBe(3250);
    expect(one.summary.totalImpactInHorizon).toBe(-150);
    expect(one.summary.totalImpactFull).toBe(-1800);
  });
});

describe('composeScenario: centavos sem deriva', () => {
  it('somar 0,1 + 0,2 repetido não vaza casas', () => {
    const b = [{ year: 2026, month: 10, label: 'out/26', income: 0, committed: 0, variable: 0, result: 0, balance: 0.1 }];
    const imp = [{ id: 'x', monthly: [0.2], totalInHorizon: 0.2, totalFull: 0.2 }];
    const c = composeScenario({ baseline: b, impacts: imp, openingBalance: 0.1, enabledIds: ['x'] });
    expect(c.months[0].balance).toBe(0.3);
    expect(c.months[0].delta).toBe(0.2);
  });
});

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
