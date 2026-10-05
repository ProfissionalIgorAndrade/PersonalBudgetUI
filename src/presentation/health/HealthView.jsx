import React, { useMemo, useState } from 'react';
import { curMonth } from '../../core/utils/format';
import MonthSelector from '../shared/components/MonthSelector';
import { evaluateHealth } from './logic/score';
import {
  monthSeries, monthTotals, savingOpportunities, topCategories, topExpenses, futurePlan, savingsGoals,
} from './logic/metrics';
import HlVerdict from './widgets/HlVerdict';
import HlMonthResult from './widgets/HlMonthResult';
import HlPillars from './widgets/HlPillars';
import HlSavings from './widgets/HlSavings';
import HlSpending from './widgets/HlSpending';
import HlEvolution from './widgets/HlEvolution';
import HlFuture from './widgets/HlFuture';
import HealthCustomizer from './HealthCustomizer';
import { useHealthLayout } from './useHealthLayout';
import { enabledIds, CATALOG } from './layout';
import { CATALOG_COMPONENTS } from './widgets/catalog';

const NO_SAVINGS = [];

/**
 * Saúde Financeira: o veredito primeiro, depois o porquê, onde economizar,
 * para onde vai o dinheiro e o plano de futuro.
 *
 * Tudo é calculado aqui no cliente a partir de `transactions` (que já exclui
 * transferência e movimento de caixinha) e das caixinhas em `accounts`. Os
 * agregados do backend incluem esses movimentos e distorceriam a poupança.
 * Ordem dos widgets fixa; esta tela é independente da Dashboard.
 */
export default function HealthView({ data, savingsTransactions = NO_SAVINGS, activeMonth, setActiveMonth }) {
  const { transactions = [], accounts = [], categories = [], cards = [], members = [] } = data || {};
  const { layout, toggle, move, reset } = useHealthLayout();
  const [customizing, setCustomizing] = useState(false);
  const today = useMemo(() => new Date(), []);
  const month = activeMonth || curMonth();

  const health = useMemo(() => evaluateHealth(transactions, accounts, month), [transactions, accounts, month]);
  const series = useMemo(() => monthSeries(transactions, month, 6), [transactions, month]);
  const opportunities = useMemo(() => savingOpportunities(transactions, categories, month), [transactions, categories, month]);
  const topCats = useMemo(() => topCategories(transactions, categories, month), [transactions, categories, month]);
  const totals = useMemo(() => monthTotals(transactions, month), [transactions, month]);
  const expenses = useMemo(() => topExpenses(transactions, month, 5), [transactions, month]);
  const plan = useMemo(() => futurePlan(transactions, month), [transactions, month]);
  const goals = useMemo(() => savingsGoals(accounts), [accounts]);

  const ctx = { transactions, accounts, cards, members, categories, savingsTransactions, month, today };

  return (
    <div className="hl-root">
      <div className="page-header">
        <div>
          <h1 className="page-title">🩺 Saúde Financeira</h1>
          <p className="page-sub">O mês em um veredito, com o porquê e o que fazer a respeito.</p>
        </div>
        <div className="hl-header-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setCustomizing(true)}>Personalizar</button>
          <MonthSelector month={month} onChange={setActiveMonth} />
        </div>
      </div>

      <div className="hl-stack-col">
        <HlVerdict health={health} />
        <HlMonthResult series={series} />
        <HlPillars health={health} />
        <div className="hl-two">
          <HlSavings opportunities={opportunities} />
          <HlSpending categories={topCats} totals={totals} expenses={expenses} />
        </div>
        <HlEvolution series={series} />
        <HlFuture plan={plan} goals={goals} />
      </div>

      <HealthExtras ids={enabledIds(layout)} ctx={ctx} />

      {customizing && (
        <HealthCustomizer layout={layout} onToggle={toggle} onMove={move} onReset={reset} onClose={() => setCustomizing(false)} />
      )}
    </div>
  );
}

const WIDE = new Set(CATALOG.filter(w => w.wide).map(w => w.id));

/** Widgets opcionais ligados no personalizador, sempre abaixo dos obrigatórios. */
function HealthExtras({ ids, ctx }) {
  if (ids.length === 0) {
    return <p className="hl-extras-hint">Quer ver mais? Use "Personalizar" para ligar widgets extras abaixo destes.</p>;
  }
  return (
    <section className="hl-extras" aria-labelledby="hl-extras-title">
      <h2 className="hl-extras-title" id="hl-extras-title">Extras</h2>
      <div className="hl-extras-grid">
        {ids.map(id => {
          const Widget = CATALOG_COMPONENTS[id];
          return Widget ? <div key={id} className={WIDE.has(id) ? 'hl-wide' : undefined}><Widget {...ctx} /></div> : null;
        })}
      </div>
    </section>
  );
}
