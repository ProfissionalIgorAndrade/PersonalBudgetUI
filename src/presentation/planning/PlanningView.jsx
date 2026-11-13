import React, { useMemo } from 'react';
import { curMonth, monthLabel } from '../../core/utils/format';
import SectionScreen from '../shared/components/SectionScreen';
import HealthView from '../health/HealthView';
import BudgetView from '../budget/BudgetView';
import { WhatIfScreen } from '../whatif/WhatIfView';
import { useSimulator } from '../../application/hooks/useSimulator';
import { evaluateHealth } from '../health/logic/score';
import { budgetRows, budgetSummary, pctLabel, NEAR_RATIO } from '../budget/budgetSummary';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** O número que resume a seção, numa ficha redonda tingida pelo estado. */
function Figure({ value, tone = 'neutral', small }) {
  return (
    <span className={`hh-media pl-figure pl-${tone}${small ? ' pl-figure-sm' : ''}`} aria-hidden="true">{value}</span>
  );
}

/**
 * "Planejamento": Saúde financeira, Orçamentos e E se...? numa tela só.
 * O sub-menu responde de relance a pergunta de cada seção: a nota do mês,
 * quanto dos limites já foi usado e quantas simulações estão ligadas.
 */
export default function PlanningView({
  section = 'health', onSection,
  data = {}, savingsTransactions, theme,
  activeMonth, setActiveMonth,
  budgets = [], loadBudgets, budgetOps,
  authSession = null, notify,
}) {
  const { transactions = [], accounts = [], categories = [], members = [], cards = [] } = data;
  const month = activeMonth || curMonth();
  const sim = useSimulator({ userId: authSession?.userId });

  const health = useMemo(() => evaluateHealth(transactions, accounts, month), [transactions, accounts, month]);
  const budget = useMemo(() => budgetSummary(budgetRows(categories, budgets)), [categories, budgets]);

  const enabled = sim.simulations.filter(s => s.enabled).length;
  const total   = sim.simulations.length;

  const budgetTone = budget.limitedCount === 0 ? 'neutral'
    : budget.overCount > 0 ? 'critical'
    : budget.ratio >= NEAR_RATIO ? 'warning' : 'good';

  const sections = [
    {
      id: 'health',
      label: 'Saúde financeira',
      shortLabel: 'Saúde',
      meta: health.score == null ? health.label : `${health.label} em ${monthLabel(month)}`,
      short: health.label,
      media: <Figure value={health.score ?? '—'} tone={health.score == null ? 'neutral' : health.level} />,
      render: () => (
        <HealthView data={data} savingsTransactions={savingsTransactions} theme={theme}
          activeMonth={month} setActiveMonth={setActiveMonth} />
      ),
    },
    {
      id: 'budgets',
      label: 'Orçamentos',
      meta: budget.limitedCount === 0 ? 'Nenhum limite no mês'
        : budget.overCount > 0 ? `${plural(budget.overCount, 'categoria', 'categorias')} acima do limite`
        : `${pctLabel(budget.ratio)} dos limites usados`,
      short: budget.limitedCount === 0 ? 'Sem limites' : `${pctLabel(budget.ratio)} usado`,
      media: <Figure value={budget.limitedCount === 0 ? '—' : pctLabel(budget.ratio)} tone={budgetTone} small />,
      render: () => (
        <BudgetView budgets={budgets} categories={categories} activeMonth={month} setActiveMonth={setActiveMonth}
          loadBudgets={loadBudgets} budgetOps={budgetOps} notify={notify} />
      ),
    },
    {
      id: 'simulator',
      label: 'E se...?',
      meta: sim.loading ? 'Carregando simulações…'
        : total === 0 ? 'Nenhuma simulação'
        : `${plural(total, 'simulação', 'simulações')} · ${plural(enabled, 'ligada', 'ligadas')}`,
      short: total === 0 ? 'Simular' : plural(enabled, 'ligada', 'ligadas'),
      media: <Figure value={sim.loading ? '…' : enabled} tone={enabled > 0 ? 'accent' : 'neutral'} />,
      render: () => <WhatIfScreen sim={sim} transactions={transactions} members={members} cards={cards} />,
    },
  ];

  return (
    <SectionScreen
      view="planning"
      title="Planejamento"
      sub="Como o mês está, quanto ainda cabe nos limites e o que acontece se você comprar, vender ou ganhar algo novo."
      navLabel="Seções de Planejamento"
      sections={sections}
      active={section}
      onSection={onSection}
    />
  );
}
