import { describe, it, expect } from 'vitest';
import {
  composeMonthly, buildVerdict, assignSimColors, monthStatus, ATTENTION_THRESHOLD_PCT,
} from '../compose';
import { buildSchedules } from '../schedule';
import { baseline, schedules, ALL_IDS } from './fixtures';

const norm = (s) => s.replace(/ /g, ' ');
const monthly = (enabledIds, over = {}) => composeMonthly({ baseline, schedules, enabledIds, ...over });
const verdict = (composed) => {
  const v = buildVerdict({ composed });
  return { ...v, headline: norm(v.headline), lines: v.lines.map((l) => ({ ...l, text: norm(l.text) })) };
};
const lineOf = (v, kind) => v.lines.find((l) => l.kind === kind)?.text;

/** Base de teste: [receita, despesa] por mês; null = mês sem lançamentos. */
const rows = (pairs) => pairs.map((p, i) => ({
  ym: `2026-${String(i + 1).padStart(2, '0')}`, label: `m${i}`,
  income: p ? p[0] : 0, expense: p ? p[1] : 0, result: p ? p[0] - p[1] : 0, hasData: p !== null,
  committed: 0, variable: p ? p[1] : 0,
}));
const only = (pairs, over = {}) => verdict(composeMonthly({ baseline: rows(pairs), schedules: [], enabledIds: [], ...over }));
const flat = (id, values) => ({ id, monthly: values });

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
    expect(c.countedCount).toBe(6);
    expect(c.excludedCount).toBe(0);
  });

  it('o total do período é a soma exata dos meses', () => {
    const cents = (f) => c.months.reduce((a, m) => a + Math.round(f(m) * 100), 0);
    expect(cents((m) => m.result)).toBe(Math.round(c.totals.result * 100));
    expect(cents((m) => m.income)).toBe(Math.round(c.totals.income * 100));
    expect(cents((m) => m.expense)).toBe(Math.round(c.totals.expense * 100));
  });

  it('o detalhe fixos x demais vem da base', () => {
    expect(c.months[1]).toMatchObject({ ym: '2026-11', committed: 2500.5, variable: 900.25 });
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

describe('composeMonthly: o caso do usuário (Dashboard + simulações por cima)', () => {
  // receita 27.200,00; despesa nov 12.989,29 e dez 11.489,29; 1.300/mês e 1.200 x 5 desde nov
  const base = rows([[27200, 12989.29], [27200, 11489.29]]);
  const sims = buildSchedules([
    { id: 'a', description: 'A', type: 'Expense', mode: 'Monthly', startMonth: '2026-01', amount: 1300, months: null },
    { id: 'b', description: 'B', type: 'Expense', mode: 'Installment', startMonth: '2026-01', amount: 1200, amountKind: 'PerInstallment', installments: 5 },
  ], '2026-01', 2);

  it('sobra de nov = 27.200 - 12.989,29 - 2.500 e de dez = 27.200 - 11.489,29 - 2.500', () => {
    const c = composeMonthly({ baseline: base, schedules: sims, enabledIds: ['a', 'b'] });
    expect(c.months.map((m) => m.result)).toEqual([11710.71, 13210.71]);
    expect(c.months.map((m) => m.baselineResult)).toEqual([14210.71, 15710.71]);
    expect(c.months[1]).toMatchObject({ income: 27200, expense: 11489.29 });
  });
});

describe('composeMonthly: meses sem lançamentos', () => {
  const base = rows([[4000, 3000], null, [4000, 5000], null]);
  const sim = [flat('x', [-100, -100, -100, 500])];
  const c = composeMonthly({ baseline: base, schedules: sim, enabledIds: ['x'] });

  it('aparecem como "nodata" e as simulações continuam valendo neles', () => {
    expect(c.months.map((m) => m.status)).toEqual(['ok', 'nodata', 'negative', 'nodata']);
    expect(c.months[1]).toMatchObject({ hasData: false, income: 0, expense: 0, simTotal: -100, result: -100 });
    expect(c.months[3].sims).toEqual([{ id: 'x', amount: 500 }]);
  });

  it('ficam fora dos totais, da contagem de negativos e do mês mais apertado', () => {
    expect(c.countedCount).toBe(2);
    expect(c.excludedCount).toBe(2);
    expect(c.negativeCount).toBe(1);
    expect(c.firstNegative).toBe(2);
    expect(c.totals).toMatchObject({ income: 8000, expense: 8000, simTotal: -200, result: -200, baselineResult: 0 });
    expect(c.totals.sims).toEqual([{ id: 'x', amount: -200 }]);
    expect(c.tightest).toMatchObject({ index: 2, label: 'm2' });
  });
});

describe('composeMonthly: 24 meses e centavos', () => {
  const base24 = Array.from({ length: 24 }, (_, i) => ({
    ym: `m${i}`, label: `m${i}`, income: 3000, expense: 2900.5, hasData: true, committed: 2000, variable: 900.5,
  }));
  const c = composeMonthly({ baseline: base24, schedules: [flat('m', new Array(24).fill(-100))], enabledIds: ['m'] });

  it('um item por mês, todos negativos por 50 centavos', () => {
    expect(c.months).toHaveLength(24);
    expect(c.months.every((m) => m.result === -0.5 && m.status === 'negative')).toBe(true);
    expect(c.negativeCount).toBe(24);
    expect(c.totals.result).toBe(-12);
    expect(c.totals.baselineResult).toBe(2388);
  });

  it('sem deriva de ponto flutuante', () => {
    const b = [{ ym: 'a', label: 'a', income: 0.3, expense: 0.1, hasData: true }];
    const r = composeMonthly({ baseline: b, schedules: [flat('x', [0.2])], enabledIds: ['x'] });
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

describe('buildVerdict: 1 mês', () => {
  it('positivo, com a simulação e a base', () => {
    const c = composeMonthly({ baseline: baseline.slice(0, 1), schedules: [flat('car', [-150])], enabledIds: ['car'] });
    const v = verdict(c);
    expect(v.level).toBe('good');
    expect(v.headline).toBe('Em out/26 o mês fecha com sobra de R$ 450,00 (sem simulações: R$ 600,00).');
    expect(lineOf(v, 'slack')).toBe('Você ainda pode assumir até R$ 450,00 por mês a mais sem ficar no vermelho.');
    expect(lineOf(v, 'commitment')).toBe('Com as simulações, 89% da receita de out/26 fica comprometida.');
  });

  it('negativo é crítico', () => {
    const v = only([[1000, 1300]], { schedules: [flat('x', [-200])], enabledIds: ['x'] });
    expect(v.level).toBe('critical');
    expect(v.headline).toBe('Em m0 o mês fica negativo em R$ 500,00 (sem simulações: -R$ 300,00).');
    expect(lineOf(v, 'gap')).toBe('Para m0 fechar sem ficar no vermelho, faltam R$ 500,00.');
    expect(v.slack).toBeNull();
  });
});

describe('buildVerdict: 3 ou mais meses', () => {
  it('total do período negativo é crítico, mesmo com poucos meses negativos', () => {
    const v = verdict(monthly(ALL_IDS));
    expect(v.level).toBe('critical');
    expect(v.statusLabel).toBe('Crítico');
    expect(v.headline).toBe(
      'Nos próximos 6 meses: falta total de R$ 436,57 (sem simulações: R$ 1.996,75). 1 mês fica negativo; o primeiro é jan/27.',
    );
  });

  it('mais da metade dos meses negativos é crítico, mesmo com total positivo', () => {
    const v = only([[100, 110], [100, 110], [100, 10]]);   // -10, -10, +90 => total +70
    expect(v.level).toBe('critical');
    expect(v.headline).toBe(
      'Nos próximos 3 meses: sobra total de R$ 70,00. 2 de 3 meses ficam negativos; o primeiro é m0.',
    );
  });

  it('exatamente metade negativa com total positivo não é maioria: atenção', () => {
    const v = only([[100, 110], [100, 10], [100, 110], [100, 10]]);   // 2 de 4
    expect(v.level).toBe('warning');
  });

  it('um mês negativo e total positivo é atenção, com a frase "sobram ... mas <mês> fecha negativo"', () => {
    const v = verdict(monthly([]));
    expect(v.level).toBe('warning');
    expect(v.statusLabel).toBe('Atenção');
    expect(v.headline).toBe('Em 6 meses sobram R$ 1.996,75, mas jan/27 fecha negativo.');
    expect(lineOf(v, 'gap')).toBe('Para jan/27 fechar sem ficar no vermelho, faltam R$ 700,25.');
  });

  it('com simulações, a frase mantém a base entre parênteses e conta os negativos no plural', () => {
    const v = only([[100, 110], [100, 10], [100, 10], [100, 110], [100, 10], [100, 10]],
      { schedules: [flat('x', [0, -10, 0, 0, 0, 0])], enabledIds: ['x'] });   // 2 de 6, total +330 (base +340)
    expect(v.level).toBe('warning');
    expect(v.headline).toBe(
      'Em 6 meses sobram R$ 330,00 (sem simulações: R$ 340,00), mas 2 meses fecham negativos; o primeiro é m0.',
    );
  });

  it('2 meses, um negativo e total positivo: atenção', () => {
    expect(only([[100, 110], [100, 10]]).level).toBe('warning');
    expect(only([[100, 110], [100, 100]]).level).toBe('critical');   // total -10
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

  it('atenção por margem baixa: nenhum negativo, mas um mês abaixo de 10% da receita', () => {
    const v = verdict(monthly(['car', 'phone', 'salary']));
    expect(v.level).toBe('warning');
    expect(v.headline).toContain('Todos os meses seguem positivos; o mais apertado é jan/27, com R$ 266,42 de sobra.');
    expect(lineOf(v, 'tight')).toBe(
      'A sobra de jan/27 é menor que 10% da receita do mês: qualquer imprevisto pode deixá-lo negativo.',
    );
    expect(v.commitmentPct).toBe(93);
  });

  it('exatamente 10% da receita ainda é ok', () => {
    expect(only([[1000, 900]]).level).toBe('good');
    expect(only([[1000, 900.01]]).level).toBe('warning');
  });

  it('sobra zero: não diz "positivo" nem oferece folga', () => {
    const v = only([[1000, 1000], [1000, 500]]);
    expect(v.headline).toContain('Nenhum mês fica no vermelho; o mais apertado é m0, que fecha zerado.');
    expect(v.slack).toBeNull();
    expect(v.level).toBe('warning');
  });

  it('24 meses negativos: contagem no plural', () => {
    const base24 = Array.from({ length: 24 }, () => [3000, 2900.5]);
    const v = only(base24, { schedules: [flat('m', new Array(24).fill(-100))], enabledIds: ['m'] });
    expect(v.level).toBe('critical');
    expect(v.headline).toBe(
      'Nos próximos 24 meses: falta total de R$ 12,00 (sem simulações: R$ 2.388,00). 24 de 24 meses ficam negativos; o primeiro é m0.',
    );
  });
});

describe('buildVerdict: sem simulações ligadas', () => {
  it('descreve só a base e convida a adicionar uma', () => {
    const v = verdict(monthly([]));
    expect(v.headline).not.toContain('sem simulações');
    expect(lineOf(v, 'hint')).toContain('Adicione uma compra, renda ou gasto');
    expect(lineOf(v, 'commitment')).toBe('118% da receita de jan/27 fica comprometida.');
  });

  it('todas desligadas equivale a nenhuma simulação', () => {
    expect(verdict(monthly([])).lines.map((l) => l.kind)).toContain('hint');
    expect(verdict(monthly(ALL_IDS)).lines.map((l) => l.kind)).not.toContain('hint');
  });
});

describe('buildVerdict: meses sem lançamentos', () => {
  it('ficam fora da conta e o veredito diz quantos', () => {
    // nov e dez com dados; as outras 2 sem lançamentos (uma com simulação negativa grande, que não conta)
    const v = only([[4000, 3000], null, [4000, 3500], null],
      { schedules: [flat('x', [0, -99999, 0, -99999])], enabledIds: ['x'] });
    expect(v.level).toBe('good');
    expect(v.headline).toBe(
      'Nos 2 meses com lançamentos: sobra total de R$ 1.500,00 (sem simulações: R$ 1.500,00). '
      + 'Todos os meses seguem positivos; o mais apertado é m2, com R$ 500,00 de sobra.',
    );
    expect(lineOf(v, 'excluded')).toBe('2 meses sem lançamentos não entram na conta.');
  });

  it('singular quando é um só', () => {
    const v = only([[4000, 3000], null, [4000, 2000]]);
    expect(lineOf(v, 'excluded')).toBe('1 mês sem lançamentos não entra na conta.');
  });

  it('só um mês com dados usa a frase do mês', () => {
    const v = only([null, [1000, 1300], null]);
    expect(v.level).toBe('critical');
    expect(v.headline).toBe('Em m1 o mês fica negativo em R$ 300,00.');
    expect(lineOf(v, 'excluded')).toBe('2 meses sem lançamentos não entram na conta.');
  });

  it('nenhum mês com lançamentos: desconhecido, sem cifras', () => {
    const v = only([null, null]);
    expect(v.level).toBe('unknown');
    expect(v.statusLabel).toBe('Sem dados');
    expect(v.headline).not.toContain('R$');
    expect(lineOf(v, 'excluded')).toBe('2 meses sem lançamentos não entram na conta.');
  });

  it('sem meses: desconhecido', () => {
    expect(buildVerdict({ composed: composeMonthly({ baseline: [], schedules: [], enabledIds: [] }) }).level).toBe('unknown');
  });
});
