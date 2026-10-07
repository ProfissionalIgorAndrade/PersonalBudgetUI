import { describe, it, expect } from 'vitest';
import { buildSchedule, buildSchedules, monthsUntil } from '../schedule';

/**
 * Casos de ouro portados de ImpactScheduleTests.cs (backend): referência
 * out/26, horizonte de 6 meses: out/26 nov/26 dez/26 jan/27 fev/27 mar/27.
 */
const REF = '2026-10';
const def = (mode, over = {}) => ({
  id: 'i1', description: 'Teste', type: 'Expense', mode, startMonth: '2026-10', amount: 100,
  amountKind: 'PerInstallment', installments: null, months: null, ...over,
});
const build = (d, horizon = 6) => buildSchedule(d, REF, horizon);
const codes = (s) => s.warnings.map((w) => w.code);

describe('parcelas', () => {
  it('Total: o resto fica na última parcela', () => {
    const s = build(def('Installment', { amount: 100, amountKind: 'Total', installments: 3 }));
    expect(s.installmentAmount).toBe(33.33);
    expect(s.lastInstallmentAmount).toBe(33.34);
    expect(s.monthly).toEqual([-33.33, -33.33, -33.34, 0, 0, 0]);
    expect(s.totalFull).toBe(-100);
    expect(s.totalInHorizon).toBe(-100);
    expect(s.warnings).toEqual([]);
  });

  it('Total em 12 parcelas: a última absorve a diferença de arredondamento', () => {
    const s = build(def('Installment', { amount: 1000, amountKind: 'Total', installments: 12 }), 12);
    expect(s.installmentAmount).toBe(83.33);
    expect(s.lastInstallmentAmount).toBe(83.37);
    expect(s.monthly[10]).toBe(-83.33);
    expect(s.monthly[11]).toBe(-83.37);
    expect(s.totalFull).toBe(-1000);
  });

  it('Total em 1 parcela é o valor inteiro', () => {
    const s = build(def('Installment', { amount: 99.99, amountKind: 'Total', installments: 1 }));
    expect(s.installmentAmount).toBe(99.99);
    expect(s.lastInstallmentAmount).toBe(99.99);
    expect(s.totalFull).toBe(-99.99);
  });

  it('PerInstallment usa o valor dado em todas as parcelas', () => {
    const s = build(def('Installment', { amount: 150, installments: 4 }));
    expect(s.installmentAmount).toBe(150);
    expect(s.lastInstallmentAmount).toBe(150);
    expect(s.monthly).toEqual([-150, -150, -150, -150, 0, 0]);
    expect(s.totalFull).toBe(-600);
    expect(s.installmentsTotal).toBe(4);
    expect(s.installmentsInHorizon).toBe(4);
  });

  it('receita é positiva e despesa é negativa', () => {
    expect(build(def('Single', { type: 'Income', amount: 500 })).monthly[0]).toBe(500);
    expect(build(def('Single', { type: 'Expense', amount: 500 })).monthly[0]).toBe(-500);
  });
});

describe('única e mensal', () => {
  it('Single cai só no mês de início', () => {
    const s = build(def('Single', { startMonth: '2026-12', amount: 500 }));
    expect(s.monthly).toEqual([0, 0, -500, 0, 0, 0]);
    expect(s.totalInHorizon).toBe(-500);
    expect(s.totalFull).toBe(-500);
    expect(s.installmentAmount).toBeNull();
    expect(s.installmentsTotal).toBe(1);
    expect(s.warnings).toEqual([]);
  });

  it('Monthly sem duração vai até o fim do horizonte', () => {
    const s = build(def('Monthly', { startMonth: '2026-11', amount: 300 }));
    expect(s.monthly).toEqual([0, -300, -300, -300, -300, -300]);
    expect(s.totalInHorizon).toBe(-1500);
    expect(s.totalFull).toBe(-1500);
    expect(s.installmentsTotal).toBeNull();
    expect(s.warnings).toEqual([]);
  });

  it('Monthly com duração 0 se comporta como sem duração', () => {
    const s = build(def('Monthly', { amount: 300, months: 0 }));
    expect(s.installmentsInHorizon).toBe(6);
    expect(s.totalFull).toBe(-1800);
  });

  it('Monthly com duração para depois dos meses dados', () => {
    const s = build(def('Monthly', { amount: 300, months: 2 }));
    expect(s.monthly).toEqual([-300, -300, 0, 0, 0, 0]);
    expect(s.totalFull).toBe(-600);
    expect(s.installmentsTotal).toBe(2);
    expect(s.warnings).toEqual([]);
  });

  it('Monthly com duração além do horizonte: total completo maior e aviso AfterWindow', () => {
    const s = build(def('Monthly', { startMonth: '2027-02', amount: 300, months: 3 }));
    expect(s.monthly).toEqual([0, 0, 0, 0, -300, -300]);
    expect(s.totalInHorizon).toBe(-600);
    expect(s.totalFull).toBe(-900);
    expect(s.installmentsInHorizon).toBe(2);
    expect(s.installmentsTotal).toBe(3);
    expect(codes(s)).toEqual(['AfterWindow']);
  });
});

describe('calendário', () => {
  it('parcelada atravessa a virada do ano (nov a fev)', () => {
    const s = build(def('Installment', { startMonth: '2026-11', amount: 200, installments: 4 }));
    expect(s.monthly).toEqual([0, -200, -200, -200, -200, 0]);
    expect(s.warnings).toEqual([]);
  });

  it('monthsUntil atravessa o ano nos dois sentidos', () => {
    expect(monthsUntil('2026-10', '2027-03')).toBe(5);
    expect(monthsUntil('2026-01', '2025-12')).toBe(-1);
    expect(monthsUntil('2026-10', '2026-10')).toBe(0);
  });
});

describe('janela e avisos', () => {
  it('parcelada que começa antes da janela é truncada e mantém o total completo', () => {
    // jul/26 a jun/27: 12 parcelas; a janela pega out/26 a mar/27 (6 delas).
    const s = build(def('Installment', { startMonth: '2026-07', amount: 100, installments: 12 }));
    expect(s.monthly).toEqual([-100, -100, -100, -100, -100, -100]);
    expect(s.installmentsInHorizon).toBe(6);
    expect(s.installmentsTotal).toBe(12);
    expect(s.totalInHorizon).toBe(-600);
    expect(s.totalFull).toBe(-1200);
    expect(codes(s)).toEqual(['Truncated', 'AfterWindow']);
  });

  it('parcelada que termina antes da janela: BeforeWindow e nenhum valor mensal', () => {
    const s = build(def('Installment', { startMonth: '2026-05', amount: 100, installments: 3 }));
    expect(s.monthly.every((v) => v === 0)).toBe(true);
    expect(s.totalInHorizon).toBe(0);
    expect(s.totalFull).toBe(-300);
    expect(s.installmentsInHorizon).toBe(0);
    expect(codes(s)).toEqual(['BeforeWindow']);
  });

  it('Single depois do horizonte: só no total completo, com aviso', () => {
    const s = build(def('Single', { startMonth: '2027-06', amount: 800 }));
    expect(s.monthly.every((v) => v === 0)).toBe(true);
    expect(s.totalInHorizon).toBe(0);
    expect(s.totalFull).toBe(-800);
    expect(codes(s)).toEqual(['AfterWindow']);
  });

  it('parcelada que começa logo depois do horizonte avisa AfterWindow', () => {
    const s = build(def('Installment', { startMonth: '2027-04', amount: 100, installments: 2 }));
    expect(s.installmentsInHorizon).toBe(0);
    expect(s.totalFull).toBe(-200);
    expect(codes(s)).toEqual(['AfterWindow']);
  });

  it('Monthly sem duração começando depois do horizonte: vazia, total 0 e aviso', () => {
    const s = build(def('Monthly', { startMonth: '2027-05', amount: 300 }));
    expect(s.monthly.every((v) => v === 0)).toBe(true);
    expect(s.totalFull).toBe(0);
    expect(codes(s)).toEqual(['AfterWindow']);
  });

  it('Monthly sem duração começando antes da janela: truncada, conta até o fim do horizonte', () => {
    // ago/26 a mar/27 = 8 meses; 6 dentro da janela.
    const s = build(def('Monthly', { startMonth: '2026-08', amount: 100 }));
    expect(s.totalInHorizon).toBe(-600);
    expect(s.totalFull).toBe(-800);
    expect(codes(s)).toEqual(['Truncated']);
  });

  it('o aviso carrega o id e cita a simulação e o mês', () => {
    const [w] = build(def('Single', { startMonth: '2027-06' })).warnings;
    expect(w.impactId).toBe('i1');
    expect(w.message).toContain('Teste');
    expect(w.message).toContain('mar/27');
  });

  it('horizonte de 1 mês: só o mês de referência fica dentro', () => {
    const s = build(def('Installment', { startMonth: '2026-10', amount: 100, installments: 3 }), 1);
    expect(s.monthly).toEqual([-100]);
    expect(s.installmentsInHorizon).toBe(1);
    expect(s.totalFull).toBe(-300);
    expect(codes(s)).toEqual(['AfterWindow']);
  });

  it('simulação com valor inválido não quebra: vetor zerado', () => {
    const s = build(def('Installment', { amount: 0, installments: 3 }));
    expect(s.monthly.every((v) => v === 0)).toBe(true);
    expect(s.totalFull).toBe(0);
  });
});

describe('buildSchedules', () => {
  it('um cronograma por simulação, na ordem, ligada ou não', () => {
    const list = [def('Single'), { ...def('Single', { amount: 5 }), id: 'i2', enabled: false }];
    const out = buildSchedules(list, REF, 3);
    expect(out.map((s) => s.id)).toEqual(['i1', 'i2']);
    expect(out[1].monthly).toEqual([-5, 0, 0]);
  });
});
