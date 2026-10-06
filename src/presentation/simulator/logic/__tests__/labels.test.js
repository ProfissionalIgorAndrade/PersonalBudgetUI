import { describe, it, expect } from 'vitest';
import {
  describeSimulation, previewText, addMonths, shortMonth, signedMoney, projectionMonthLabel, MODE_LABEL,
} from '../labels';

// Intl usa espaço não separável depois de "R$"; normaliza para comparar.
const n = (s) => s.replace(/\u00a0/g, ' ');

const sim = (over = {}) => ({
  id: 'a', enabled: true, description: 'Carro', type: 'Expense', mode: 'Installment',
  startMonth: '2026-03', amount: 150, amountKind: 'PerInstallment', installments: 12, months: null, ...over,
});

describe('describeSimulation', () => {
  it('parcelada: frase do plano com as parcelas dentro do horizonte', () => {
    expect(n(describeSimulation(sim(), { installmentsInHorizon: 6 })))
      .toBe('12× R$ 150,00 = R$ 1.800,00 · mar/26 a fev/27 · 6 parcelas dentro do horizonte');
  });

  it('parcelada por valor total mostra a última parcela quando difere', () => {
    expect(n(describeSimulation(sim({ amount: 1000, amountKind: 'Total' }), { installmentsInHorizon: 1 })))
      .toBe('12× R$ 83,33 (última R$ 83,37) = R$ 1.000,00 · mar/26 a fev/27 · 1 parcela dentro do horizonte');
  });

  it('nenhuma parcela dentro do horizonte e sem projeção', () => {
    expect(n(describeSimulation(sim(), { installmentsInHorizon: 0 }))).toContain('nenhuma parcela dentro do horizonte');
    expect(n(describeSimulation(sim()))).toBe('12× R$ 150,00 = R$ 1.800,00 · mar/26 a fev/27');
  });

  it('única e mensal', () => {
    expect(n(describeSimulation(sim({ mode: 'Single', installments: null })))).toBe('R$ 150,00 · mar/26');
    expect(n(describeSimulation(sim({ mode: 'Monthly', installments: null }))))
      .toBe('R$ 150,00 por mês · a partir de mar/26 · até o fim do horizonte');
    expect(n(describeSimulation(sim({ mode: 'Monthly', installments: null, months: 6 }))))
      .toBe('R$ 150,00 por mês · a partir de mar/26 · por 6 meses (até ago/26)');
  });
});

describe('previewText', () => {
  it('parcelada: parcela e última parcela ao vivo', () => {
    expect(n(previewText({ mode: 'Installment', amount: 150, amountKind: 'PerInstallment', installments: '12', startMonth: '2026-10' })))
      .toBe('12× R$ 150,00 · última parcela R$ 150,00 · total R$ 1.800,00');
    expect(n(previewText({ mode: 'Installment', amount: 1000, amountKind: 'Total', installments: '12', startMonth: '2026-10' })))
      .toBe('12× R$ 83,33 · última parcela R$ 83,37 · total R$ 1.000,00');
  });

  it('vazia quando faltam dados', () => {
    expect(previewText({ mode: 'Installment', amount: 0, amountKind: 'Total', installments: '12', startMonth: '2026-10' })).toBe('');
    expect(previewText({ mode: 'Single', amount: 10, startMonth: '' })).toBe('');
    expect(previewText({ mode: 'Installment', amount: 10, amountKind: 'Total', installments: '', startMonth: '2026-10' })).toBe('');
  });

  it('mensal com e sem duração', () => {
    expect(n(previewText({ mode: 'Monthly', amount: 800, months: '', startMonth: '2026-10' })))
      .toBe('R$ 800,00 por mês, a partir de out/26 até o fim do horizonte');
    expect(n(previewText({ mode: 'Monthly', amount: 800, months: '1', startMonth: '2026-10' })))
      .toBe('R$ 800,00 por mês, por 1 mês, a partir de out/26');
  });
});

describe('helpers de rótulo', () => {
  it('addMonths vira o ano', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });
  it('shortMonth e signedMoney', () => {
    expect(shortMonth('2027-02')).toBe('fev/27');
    expect(n(signedMoney(-5))).toBe('−R$ 5,00');
    expect(n(signedMoney(5))).toBe('+R$ 5,00');
    expect(n(signedMoney(0))).toBe('R$ 0,00');
  });
  it('primeiro mês é rotulado como restante', () => {
    const e = { year: 2026, month: 10, label: 'out/26' };
    expect(projectionMonthLabel(e, 0, { long: true })).toBe('restante de outubro');
    expect(projectionMonthLabel(e, 0)).toBe('out/26*');
    expect(projectionMonthLabel(e, 1)).toBe('out/26');
  });
  it('um só MODE_LABEL com as três modalidades', () => {
    expect(MODE_LABEL).toEqual({ Single: 'Única', Installment: 'Parcelada', Monthly: 'Mensal' });
  });
});
