import { describe, it, expect } from 'vitest';
import {
  composeMonthly, buildVerdict, assignSimColors, monthStatus, fullMonthCents, ATTENTION_THRESHOLD_PCT,
} from '../compose';
import { baseline, baselineFull, impacts, ALL_IDS } from './fixtures';

const norm = (s) => s.replace(/\u00a0/g, ' ');
const monthly = (enabledIds, over = {}) => composeMonthly({ baseline: baselineFull, impacts, enabledIds, ...over });
const verdict = (composed, over = {}) => {
  const v = buildVerdict({ composed, ...over });
  return { ...v, headline: norm(v.headline), lines: v.lines.map((l) => ({ ...l, text: norm(l.text) })) };
};
const lineOf = (v, kind) => v.lines.find((l) => l.kind === kind)?.text;

describe('composeMonthly: todas ligadas (números à mão)', () => {
  const c = monthly(ALL_IDS);

  it('receita, despesa, simulações assinadas e sobra por mês', () => {
    expect(c.months.map((m) => m.income)).toEqual([4000, 4000, 4000, 4000, 4000, 4000]);
    expect(c.months.map((m) => m.expense)).toEqual([3400, 3400.75, 3700.75, 4700.25, 3400.75, 3400.75]);
    expect(c.months.map((m) => m.simTotal)).toEqual([-150, -150, 966.67, -5033.33, 966.67, 966.67]);
    expect(c.months.map((m) => m.baselineResult)).toEqual([600, 599.25, 299.25, -700.25, 599.25, 599.25]);
    expect(c.months.map((m) => m.result)).toEqual([450, 449.25, 1265.92, -5733.58, 1565.92, 1565.92]);
    expect(c.months.map((m) => m.status)).toEqual(['ok', 'ok', 'ok', 'negative', 'ok', 'ok']);
    expect(c.months[3].sims).toEqual([
      { id: 'car', amount: -150 }, { id: 'phone', amount: -83.33 }, { id: 'salary', amount: 1200 }, { id: 'trip', amount: -6000 },
    ]);
  });

  it('cada linha fecha: receita - despesa + simulações = sobra (em centavos)', () => {
    c.months.forEach((m) => {
      const sum = Math.round(m.income * 100) - Math.round(m.expense * 100)
        + m.sims.reduce((a, s) => a + Math.round(s.amount * 100), 0);
      expect(sum).toBe(Math.round(m.result * 100));
      expect(Math.round(m.simTotal * 100)).toBe(m.sims.reduce((a, s) => a + Math.round(s.amount * 100), 0));
    });
  });

  it('totais do período, menor sobra e meses negativos', () => {
    expect(c.totals).toEqual({
      income: 24000, expense: 22003.25, simTotal: -2433.32, result: -436.57, baselineResult: 1996.75,
      sims: [
        { id: 'car', amount: -900 }, { id: 'phone', amount: -333.32 }, { id: 'salary', amount: 4800 }, { id: 'trip', amount: -6000 },
      ],
    });
    expect(c.tightest).toEqual({ index: 3, label: 'jan/27', result: -5733.58, income: 4000, baselineResult: -700.25 });
    expect(c.negativeCount).toBe(1);
    expect(c.firstNegative).toBe(3);
    expect(c.fullMonthFallback).toBe(false);
  });

  it('o total do período é a soma exata dos meses', () => {
    const cents = (f) => c.months.reduce((a, m) => a + Math.round(f(m) * 100), 0);
    expect(cents((m) => m.result)).toBe(Math.round(c.totals.result * 100));
    expect(cents((m) => m.income)).toBe(Math.round(c.totals.income * 100));
    expect(cents((m) => m.expense)).toBe(Math.round(c.totals.expense * 100));
  });

  it('o mês atual usa o mês inteiro, não o restante (committed/variable seguem como detalhe do restante)', () => {
    expect(c.months[0].income).toBe(4000);
    expect(c.months[0].committed).toBe(1800);
    expect(c.months[0].variable).toBe(300);
    expect(c.months[0].detailIsRemaining).toBe(true);
    expect(c.months[1].detailIsRemaining).toBe(false);
  });
});

describe('composeMonthly: liga/desliga', () => {
  it('uma simulação desligada some das colunas e da soma', () => {
    const c = monthly(['car', 'phone', 'salary']);
    expect(c.simIds).toEqual(['car', 'phone', 'salary']);
    expect(c.months.map((m) => m.simTotal)).toEqual([-150, -150, 966.67, 966.67, 966.67, 966.67]);
    expect(c.months.map((m) => m.result)).toEqual([450, 449.25, 1265.92, 266.42, 1565.92, 1565.92]);
    expect(c.months.every((m) => m.sims.length === 3)).toBe(true);
    expect(c.totals.result).toBe(5563.43);
  });

  it('todas desligadas: cenário igual à base', () => {
    const c = monthly([]);
    expect(c.simIds).toEqual([]);
    expect(c.months.map((m) => m.result)).toEqual(c.months.map((m) => m.baselineResult));
    expect(c.months.every((m) => m.sims.length === 0 && m.simTotal === 0)).toBe(true);
    expect(c.totals.result).toBe(c.totals.baselineResult);
    expect(c.tightest).toEqual({ index: 3, label: 'jan/27', result: -700.25, income: 4000, baselineResult: -700.25 });
    expect(c.negativeCount).toBe(1);
  });

  it('ids desconhecidos são ignorados; a ordem das colunas segue enabledIds', () => {
    expect(monthly(['nao-existe']).simIds).toEqual([]);
    expect(monthly(['trip', 'car']).simIds).toEqual(['trip', 'car']);
  });
});

describe('composeMonthly: sem fullMonth (backend antigo)', () => {
  const c = composeMonthly({ baseline, impacts, enabledIds: [] });

  it('cai para income e committed + variable', () => {
    expect(c.fullMonthFallback).toBe(true);
    expect(c.months[0]).toMatchObject({ income: 500, expense: 2100, baselineResult: -1600, result: -1600, status: 'negative' });
    expect(c.months[1]).toMatchObject({ income: 4000, expense: 3400.75, baselineResult: 599.25 });
    expect(fullMonthCents(baseline[0])).toEqual({ incomeC: 50000, expenseC: 210000, fallback: true });
  });

  it('um fullMonth parcial não conta como presente', () => {
    expect(fullMonthCents({ ...baseline[0], fullMonth: { income: 1 } }).fallback).toBe(true);
  });
});

describe('composeMonthly: 24 meses e centavos', () => {
  const base24 = Array.from({ length: 24 }, (_, i) => {
    const ord = 2026 * 12 + 9 + i;
    const year = Math.floor(ord / 12);
    const month = (ord % 12) + 1;
    return {
      year, month, label: `m${i}`, income: 3000, committed: 2000, variable: 900.5,
      fullMonth: { income: 3000, expense: 2900.5, result: 99.5 },
    };
  });
  const imp24 = [{ id: 'm', monthly: new Array(24).fill(-100) }];
  const c = composeMonthly({ baseline: base24, impacts: imp24, enabledIds: ['m'] });

  it('filtro de 24 meses: um item por mês, todos negativos por 50 centavos', () => {
    expect(c.months).toHaveLength(24);
    expect(c.months.every((m) => m.result === -0.5 && m.status === 'negative')).toBe(true);
    expect(c.negativeCount).toBe(24);
    expect(c.firstNegative).toBe(0);
    expect(c.totals.result).toBe(-12);
    expect(c.totals.baselineResult).toBe(2388);
    expect(c.tightest.index).toBe(0);
  });

  it('sem deriva de ponto flutuante', () => {
    const b = [{ label: 'a', fullMonth: { income: 0.3, expense: 0.1 } }];
    const r = composeMonthly({ baseline: b, impacts: [{ id: 'x', monthly: [0.2] }], enabledIds: ['x'] });
    expect(r.months[0].result).toBe(0.4);
    expect(r.months[0].baselineResult).toBe(0.2);
  });
});

describe('monthStatus e limiar de atenção', () => {
  it('limiar nomeado em 10%', () => {
    expect(ATTENTION_THRESHOLD_PCT).toBe(10);
  });
  it('negativo, apertado (< 10% da receita) e ok (>= 10%)', () => {
    expect(monthStatus(-1, 100000)).toBe('negative');
    expect(monthStatus(0, 100000)).toBe('tight');
    expect(monthStatus(39999, 400000)).toBe('tight');
    expect(monthStatus(40000, 400000)).toBe('ok');
    expect(monthStatus(0, 0)).toBe('ok');
  });
});

describe('assignSimColors', () => {
  it('cor por posição na lista completa; a sétima em diante vira "other"', () => {
    const sims = Array.from({ length: 8 }, (_, i) => ({ id: `s${i}`, enabled: i % 2 === 0 }));
    const colors = assignSimColors(sims);
    expect(sims.map((s) => colors[s.id])).toEqual([1, 2, 3, 4, 5, 6, 'other', 'other']);
    expect(assignSimColors(sims.map((s) => ({ ...s, enabled: !s.enabled })))).toEqual(colors);
  });
});

describe('buildVerdict', () => {
  it('1 mês positivo, com a simulação e a base', () => {
    const c = composeMonthly({
      baseline: baselineFull.slice(0, 1), enabledIds: ['car'],
      impacts: [{ ...impacts[0], monthly: [-150] }],
    });
    const v = verdict(c);
    expect(v.level).toBe('good');
    expect(v.headline).toBe('Em out/26 o mês fecha com sobra de R$ 450,00 (sem simulações: R$ 600,00).');
    expect(lineOf(v, 'slack')).toBe('Você ainda pode assumir até R$ 450,00 por mês a mais sem ficar no vermelho.');
    expect(lineOf(v, 'commitment')).toBe('Com as simulações, 89% da receita de out/26 fica comprometida.');
  });

  it('1 mês negativo', () => {
    const c = composeMonthly({
      baseline: [{ label: 'out/26', fullMonth: { income: 1000, expense: 1300 } }],
      enabledIds: ['x'], impacts: [{ id: 'x', monthly: [-200] }],
    });
    const v = verdict(c);
    expect(v.level).toBe('critical');
    expect(v.headline).toBe('Em out/26 o mês fica negativo em R$ 500,00 (sem simulações: -R$ 300,00).');
    expect(lineOf(v, 'gap')).toBe('Para out/26 fechar sem ficar no vermelho, faltam R$ 500,00.');
    expect(v.slack).toBeNull();
  });

  it('3 meses com o primeiro negativo (crítico)', () => {
    const c = composeMonthly({
      baseline: baselineFull.slice(2, 5), enabledIds: ALL_IDS,
      impacts: impacts.map((i) => ({ ...i, monthly: i.monthly.slice(2, 5) })),
    });
    // dez: 299,25+966,67 = 1265,92 | jan: -5733,58 | fev: 599,25+966,67 = 1565,92  => total -2901,74
    const v = verdict(c);
    expect(v.level).toBe('critical');
    expect(v.headline).toBe(
      'Nos próximos 3 meses: falta total de R$ 2.901,74 (sem simulações: R$ 198,25). 1 mês fica negativo; o primeiro é jan/27.',
    );
    expect(v.statusLabel).toBe('Crítico');
  });

  it('6 meses, vários negativos: K de N e o primeiro', () => {
    const b = [-5, 10, -3].map((r, i) => ({ label: `m${i}`, fullMonth: { income: 100, expense: 100 - r } }));
    const v = verdict(composeMonthly({ baseline: b, impacts: [], enabledIds: [] }));
    expect(v.headline).toBe(
      'Nos próximos 3 meses: sobra total de R$ 2,00. 2 de 3 meses ficam negativos; o primeiro é m0.',
    );
  });

  it('nenhum negativo e folga: o mês mais apertado', () => {
    const v = verdict(monthly(['salary']));
    expect(v.level).toBe('good');
    expect(v.headline).toBe(
      'Nos próximos 6 meses: sobra total de R$ 6.796,75 (sem simulações: R$ 1.996,75). '
      + 'Todos os meses seguem positivos; o mais apertado é jan/27, com R$ 499,75 de sobra.',
    );
    expect(v.slack).toBe(499.75);
    expect(lineOf(v, 'slack')).toBe('Você ainda pode assumir até R$ 499,75 por mês a mais sem ficar no vermelho.');
    expect(v.commitmentPct).toBe(88);
    expect(lineOf(v, 'commitment')).toBe('Com as simulações, 88% da receita de jan/27 fica comprometida.');
  });

  it('atenção por sobra baixa: nenhum negativo, mas um mês abaixo de 10% da receita', () => {
    const v = verdict(monthly(['car', 'phone', 'salary']));
    expect(v.level).toBe('warning');
    expect(v.statusLabel).toBe('Atenção');
    expect(v.headline).toContain('Todos os meses seguem positivos; o mais apertado é jan/27, com R$ 266,42 de sobra.');
    expect(lineOf(v, 'tight')).toBe(
      'A sobra de jan/27 é menor que 10% da receita do mês: qualquer imprevisto pode deixá-lo negativo.',
    );
    expect(v.commitmentPct).toBe(93);
  });

  it('exatamente 10% da receita ainda é ok', () => {
    const b = [{ label: 'a', fullMonth: { income: 1000, expense: 900 } }];
    expect(buildVerdict({ composed: composeMonthly({ baseline: b, impacts: [], enabledIds: [] }) }).level).toBe('good');
    const b2 = [{ label: 'a', fullMonth: { income: 1000, expense: 900.01 } }];
    expect(buildVerdict({ composed: composeMonthly({ baseline: b2, impacts: [], enabledIds: [] }) }).level).toBe('warning');
  });

  it('sobra zero: não diz "positivo" nem oferece folga', () => {
    const b = [{ label: 'a', fullMonth: { income: 1000, expense: 1000 } }, { label: 'b', fullMonth: { income: 1000, expense: 500 } }];
    const v = verdict(composeMonthly({ baseline: b, impacts: [], enabledIds: [] }));
    expect(v.headline).toContain('Nenhum mês fica no vermelho; o mais apertado é a, que fecha zerado.');
    expect(v.slack).toBeNull();
    expect(v.level).toBe('warning');
  });

  it('sem simulações ligadas: não compara com a base e incentiva adicionar uma', () => {
    const v = verdict(monthly([]));
    expect(v.headline).toBe(
      'Nos próximos 6 meses: sobra total de R$ 1.996,75. 1 mês fica negativo; o primeiro é jan/27.',
    );
    expect(v.headline).not.toContain('sem simulações');
    expect(lineOf(v, 'hint')).toContain('Adicione uma compra, renda ou gasto');
    expect(lineOf(v, 'commitment')).toBe('118% da receita de jan/27 fica comprometida.');
  });

  it('todas desligadas equivale a nenhuma simulação', () => {
    expect(verdict(monthly([])).lines.map((l) => l.kind)).toContain('hint');
  });

  it('sem histórico: diz que não há dados, sem números zerados', () => {
    const v = verdict(monthly([]), { hasHistory: false, lookbackMonths: 3 });
    expect(v.level).toBe('unknown');
    expect(v.headline).toBe('Ainda não há histórico suficiente para projetar os meses.');
    expect(v.lines).toHaveLength(1);
    expect(v.lines[0].text).toContain('últimos 3 meses');
    expect(v.headline).not.toContain('R$');
  });

  it('sem meses: nível desconhecido', () => {
    const v = buildVerdict({ composed: composeMonthly({ baseline: [], impacts: [], enabledIds: [] }) });
    expect(v.level).toBe('unknown');
  });

  it('24 meses negativos: contagem no plural', () => {
    const base24 = Array.from({ length: 24 }, (_, i) => ({ label: `m${i}`, fullMonth: { income: 3000, expense: 2900.5 } }));
    const c = composeMonthly({ baseline: base24, impacts: [{ id: 'm', monthly: new Array(24).fill(-100) }], enabledIds: ['m'] });
    expect(verdict(c).headline).toBe(
      'Nos próximos 24 meses: falta total de R$ 12,00 (sem simulações: R$ 2.388,00). 24 de 24 meses ficam negativos; o primeiro é m0.',
    );
  });
});
