import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import React from 'react';
import VerdictBanner from '../VerdictBanner';
import MonthlyChart from '../MonthlyChart';
import MonthlyTable from '../MonthlyTable';
import { composeMonthly, buildVerdict, assignSimColors } from '../../logic/compose';
import { simulationName } from '../../logic/labels';
import { baseline, baselineFull, impacts, ALL_IDS } from '../../logic/__tests__/fixtures';

afterEach(cleanup);

const norm = (s) => s.replace(/ /g, ' ');
const SIMS = [
  { id: 'car', description: 'Carro' }, { id: 'phone', description: 'Celular' },
  { id: 'salary', description: 'Freela' }, { id: 'trip', description: 'Viagem' },
];
const infos = () => {
  const colors = assignSimColors(SIMS);
  return SIMS.map((s, i) => ({ sim: s, name: simulationName(s, i), slot: colors[s.id] }));
};
const compose = (ids = ALL_IDS, over = {}) => composeMonthly({ baseline: baselineFull, impacts, enabledIds: ids, ...over });

describe('VerdictBanner', () => {
  it('crítico: ícone, texto do status, frase e linhas de apoio', () => {
    const { container } = render(<VerdictBanner verdict={buildVerdict({ composed: compose() })} />);
    const banner = screen.getByRole('region', { name: 'Veredito da simulação' });
    expect(banner.getAttribute('data-level')).toBe('critical');
    expect(container.querySelector('.wi-vd-icon').textContent).toBe('✕');
    expect(norm(banner.textContent)).toContain('Crítico');
    expect(norm(banner.textContent)).toContain('1 mês fica negativo; o primeiro é jan/27.');
    expect(norm(banner.textContent)).toContain('faltam R$ 5.733,58');
  });

  it('sem histórico: status "Sem dados" e nenhuma cifra', () => {
    render(<VerdictBanner verdict={buildVerdict({ composed: compose([]), hasHistory: false })} />);
    const banner = screen.getByRole('region', { name: 'Veredito da simulação' });
    expect(banner.textContent).toContain('Sem dados');
    expect(banner.textContent).toContain('Ainda não há histórico suficiente');
    expect(banner.textContent).not.toContain('R$');
  });
});

describe('MonthlyChart', () => {
  it('uma faixa focável por mês, com receita, despesa, simulações e sobra no rótulo', () => {
    const { container } = render(<MonthlyChart composed={compose()} infos={infos()} />);
    const hits = container.querySelectorAll('.wi-hit');
    expect(hits).toHaveLength(6);
    expect(hits[0].getAttribute('tabindex')).toBe('0');
    const jan = norm(hits[3].getAttribute('aria-label'));
    expect(jan).toContain('jan/27');
    expect(jan).toContain('receita R$ 4.000,00');
    expect(jan).toContain('Viagem -R$ 6.000,00');
    expect(jan).toContain('sobra do mês -R$ 5.733,58 (negativo)');
    expect(hits[0].getAttribute('aria-label')).not.toContain('(negativo)');
  });

  it('empilha por simulação e usa a cor da simulação; só as ligadas entram', () => {
    const { container } = render(<MonthlyChart composed={compose(['car', 'trip'])} infos={infos()} />);
    expect(container.querySelectorAll('.wi-mc-seg.wi-cat-1').length).toBe(6);   // Carro: todos os meses
    expect(container.querySelectorAll('.wi-mc-seg.wi-cat-4').length).toBe(1);   // Viagem: só jan/27
    expect(container.querySelectorAll('.wi-mc-seg.wi-cat-2').length).toBe(0);   // Celular desligado
    const legend = within(screen.getByRole('list', { name: 'Legenda' }));
    expect(legend.getByText('Carro')).toBeTruthy();
    expect(legend.queryByText('Celular')).toBeNull();
    expect(legend.getByText('Sobra do mês')).toBeTruthy();
  });

  it('marca o mês negativo com ✕ no gráfico e "negativo" no texto da leitura', () => {
    const { container } = render(<MonthlyChart composed={compose()} infos={infos()} />);
    expect(container.querySelectorAll('.wi-mc-flag')).toHaveLength(1);
    const readout = norm(container.querySelector('.wi-readout').textContent);
    expect(readout).toContain('jan/27');            // começa no primeiro mês negativo
    expect(readout).toContain('negativo');
  });

  it('foco numa faixa troca a leitura', () => {
    const { container } = render(<MonthlyChart composed={compose()} infos={infos()} />);
    fireEvent.focus(container.querySelectorAll('.wi-hit')[0]);
    const readout = norm(container.querySelector('.wi-readout').textContent);
    expect(readout).toContain('out/26');
    expect(readout).toContain('Sobra do mês: R$ 450,00');
  });

  it('mais de seis simulações ligadas: a sétima em diante vira "Outras"', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ id: `s${i}`, description: `S${i}` }));
    const colors = assignSimColors(many);
    const inf = many.map((s, i) => ({ sim: s, name: s.description, slot: colors[s.id] }));
    const imps = many.map((s) => ({ id: s.id, monthly: [-10, -10, -10, -10, -10, -10] }));
    const composed = composeMonthly({ baseline: baselineFull, impacts: imps, enabledIds: many.map((s) => s.id) });
    const { container } = render(<MonthlyChart composed={composed} infos={inf} />);
    expect(screen.getByText('Outras (2)')).toBeTruthy();
    expect(container.querySelectorAll('.wi-mc-seg.wi-cat-other')).toHaveLength(6);
  });

  it('24 meses: colunas estreitas com rolagem horizontal', () => {
    const base24 = Array.from({ length: 24 }, (_, i) => ({
      year: 2026 + Math.floor((9 + i) / 12), month: ((9 + i) % 12) + 1, label: `m${i}`,
      fullMonth: { income: 3000, expense: 2900.5 },
    }));
    const composed = composeMonthly({ baseline: base24, impacts: [], enabledIds: [] });
    const { container } = render(<MonthlyChart composed={composed} infos={[]} />);
    expect(container.querySelector('.wi-mc-scroll')).toBeTruthy();
    expect(container.querySelectorAll('.wi-hit')).toHaveLength(24);
    expect(Number(container.querySelector('svg').style.minWidth.replace('px', ''))).toBeGreaterThan(640);
  });
});

describe('MonthlyTable (gêmea do gráfico)', () => {
  it('colunas: Mês, Receita, Despesa, uma por simulação ligada, Sobra do mês e Situação', () => {
    render(<MonthlyTable composed={compose(['car', 'trip'])} infos={infos()} lookbackMonths={3} />);
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual([
      'Mês', 'Receita', 'Despesa', 'Carro', 'Viagem', 'Sobra do mês', 'Situação',
    ]);
  });

  it('mesmos números do gráfico: cada linha e a linha de total', () => {
    const composed = compose();
    render(<MonthlyTable composed={composed} infos={infos()} lookbackMonths={3} />);
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(1 + 6 + 1);
    const jan = norm(rows[4].textContent);
    expect(jan).toContain('R$ 4.000,00');
    expect(jan).toContain('−R$ 4.700,25');
    expect(jan).toContain('−R$ 6.000,00');
    expect(jan).toContain('−R$ 5.733,58');
    expect(jan).toContain('Negativo');
    expect(norm(rows[1].textContent)).toContain('Positivo');
    const total = norm(rows[7].textContent);
    expect(total).toContain('Total do período');
    expect(total).toContain('R$ 24.000,00');
    expect(total).toContain('−R$ 436,57');
    expect(total).toContain('1 de 6 negativos');
  });

  it('horizonte de 1 mês não tem linha de total', () => {
    const composed = composeMonthly({ baseline: baselineFull.slice(0, 1), impacts: [], enabledIds: [] });
    render(<MonthlyTable composed={composed} infos={[]} lookbackMonths={3} />);
    expect(screen.queryByText('Total do período')).toBeNull();
  });

  it('detalhe expansível: fixos e parcelas x gasto variável', () => {
    render(<MonthlyTable composed={compose()} infos={infos()} lookbackMonths={3} />);
    expect(screen.queryByText(/Fixos e parcelas/)).toBeNull();
    const btn = screen.getByRole('button', { name: 'Detalhe de nov/26' });
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(norm(screen.getByText(/Fixos e parcelas/).closest('td').textContent))
      .toBe('Fixos e parcelas: R$ 2.500,50 · Gasto variável estimado: R$ 900,25');
    fireEvent.click(btn);
    expect(screen.queryByText(/Fixos e parcelas/)).toBeNull();
  });

  it('o detalhe do mês atual explica que cobre só o restante', () => {
    render(<MonthlyTable composed={compose()} infos={infos()} lookbackMonths={3} />);
    fireEvent.click(screen.getByRole('button', { name: 'Detalhe de out/26' }));
    expect(norm(screen.getByText(/ainda falta acontecer em out\/26/).textContent)).toContain('R$ 1.800,00');
  });

  it('nota discreta da estimativa e, sem fullMonth, o aviso do primeiro mês', () => {
    const { unmount } = render(<MonthlyTable composed={compose()} infos={infos()} lookbackMonths={3} />);
    expect(screen.getByText(/incluem uma estimativa pela média dos 3 meses anteriores/)).toBeTruthy();
    expect(screen.queryByText(/ainda não envia o mês inteiro/)).toBeNull();
    unmount();
    render(<MonthlyTable composed={composeMonthly({ baseline, impacts, enabledIds: [] })} infos={infos()} lookbackMonths={3} />);
    expect(screen.getByText(/ainda não envia o mês inteiro/)).toBeTruthy();
  });
});
