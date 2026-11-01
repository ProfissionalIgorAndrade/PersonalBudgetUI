import { describe, it, expect } from 'vitest';
import { intentOf, modeFor, intentById, INTENTS } from '../intents';
import { niceScale, moneyShort, amountShort, tickLabel } from '../scale';
import { draftToSim } from '../../components/Composer';

describe('intenções', () => {
  it('cada combinação salva volta para um atalho', () => {
    expect(intentOf({ type: 'Expense', mode: 'Single' })).toBe('buy');
    expect(intentOf({ type: 'Expense', mode: 'Installment' })).toBe('buy-installments');
    expect(intentOf({ type: 'Expense', mode: 'Monthly' })).toBe('new-expense');
    expect(intentOf({ type: 'Income', mode: 'Single' })).toBe('sell');
    expect(intentOf({ type: 'Income', mode: 'Installment' })).toBe('sell');
    expect(intentOf({ type: 'Income', mode: 'Monthly' })).toBe('new-income');
  });

  it('venda em parcelas vira parcelada; os outros atalhos ignoram a opção', () => {
    expect(modeFor('sell', true)).toBe('Installment');
    expect(modeFor('sell', false)).toBe('Single');
    expect(modeFor('buy', true)).toBe('Single');
  });

  it('id desconhecido cai no primeiro atalho', () => {
    expect(intentById('x')).toBe(INTENTS[0]);
  });
});

describe('escala do quadro', () => {
  it('inclui o zero e passa do maior valor', () => {
    const s = niceScale([6290, -6116.71, 28083]);
    expect(s.min).toBeLessThan(-6116.71);
    expect(s.max).toBeGreaterThan(28083);
    expect(s.ticks).toContain(0);
    const steps = s.ticks.slice(1).map((t, i) => t - s.ticks[i]);
    expect(new Set(steps).size).toBe(1);
  });

  it('só valores positivos começam no zero', () => {
    expect(niceScale([100, 900]).min).toBe(0);
  });

  it('formatos curtos com sinal', () => {
    expect(moneyShort(-8935.78)).toBe('−R$ 8.936');
    expect(moneyShort(0)).toBe('R$ 0');
    expect(amountShort(1573.37)).toBe('+1.573');
    expect(tickLabel(-10000)).toBe('−10 mil');
  });
});

describe('rascunho', () => {
  const base = {
    description: '', type: 'Expense', mode: 'Installment', startMonth: '2026-11',
    amount: 6000, amountKind: 'Total', installments: '10', months: '',
  };

  it('vale sem descrição, para o quadro mostrar o efeito antes de salvar', () => {
    expect(draftToSim(base)).toMatchObject({ mode: 'Installment', installments: 10, amountKind: 'Total' });
  });

  it('sem valor não há rascunho', () => {
    expect(draftToSim({ ...base, amount: 0 })).toBeNull();
  });

  it('mensal sem prazo vai até o fim do período', () => {
    expect(draftToSim({ ...base, mode: 'Monthly', months: '' }).months).toBeNull();
  });
});
