import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { R$, curMonth, monthLabel } from '../../core/utils/format';
import { useLocalStorage } from '../../core/hooks/useLocalStorage';
import MonthSelector from '../shared/components/MonthSelector';
import SummaryCards           from './components/SummaryCards';
import CashflowWidget         from './components/CashflowWidget';
import DonutWidget             from './components/DonutWidget';
import CategoryExpensesWidget  from './components/CategoryExpensesWidget';
import CategoryIncomeWidget    from './components/CategoryIncomeWidget';
import FaturasWidget           from './components/FaturasWidget';
import TipsWidget              from './components/TipsWidget';
import RecentWidget            from './components/RecentWidget';
import MemberSummaryWidget     from './components/MemberSummaryWidget';
import CostsPerPersonWidget    from './components/CostsPerPersonWidget';
import IncomePerPersonWidget   from './components/IncomePerPersonWidget';
import DashboardCustomizer     from './components/DashboardCustomizer';

const widgetVariants = {
  hidden:  { opacity: 0, y: 18 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: 0.32 + i * 0.06, duration: 0.35, ease: [0.4,0,0.2,1] } }),
};

const DEFAULT_LAYOUT = [
  { id: 'cashflow',      label: 'Fluxo de Caixa',        icon: '📊', col: 0, order: 0, visible: true },
  { id: 'donut',         label: 'Gráfico de Despesas',    icon: '🍩', col: 0, order: 1, visible: true },
  { id: 'cat-expenses',  label: 'Despesas por Categoria', icon: '📉', col: 0, order: 2, visible: true },
  { id: 'cat-income',    label: 'Receitas por Categoria', icon: '📈', col: 0, order: 3, visible: true },
  { id: 'faturas',       label: 'Total das Faturas',      icon: '💳', col: 1, order: 0, visible: true },
  { id: 'tips',          label: 'Dicas & Alertas',        icon: '💡', col: 1, order: 1, visible: true },
  { id: 'recent',        label: 'Últimos Lançamentos',    icon: '🕐', col: 1, order: 2, visible: true },
  { id: 'by-member',     label: 'Resumo por Membro',      icon: '👥', col: 1, order: 3, visible: true },
  { id: 'costs-person',  label: 'Custos por Pessoa',      icon: '💸', col: 1, order: 4, visible: true },
  { id: 'income-person', label: 'Receitas por Pessoa',    icon: '💵', col: 1, order: 5, visible: true },
];

export default function DashboardView({ data, setView, activeMonth, setActiveMonth }) {
  const { transactions, categories, members, cards } = data;
  const [layout,        setLayout]        = useLocalStorage('pb_dash_layout', DEFAULT_LAYOUT);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [draftLayout,   setDraftLayout]   = useState(null);

  const month = activeMonth || curMonth();
  const now   = new Date();

  /* ── Calculations ───────────────────────────────────────────── */
  const mTx     = transactions.filter(t => t.date?.startsWith(month));
  const totalIn  = mTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = mTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance  = totalIn - totalOut;
  const savPct   = totalIn > 0 ? ((balance / totalIn) * 100).toFixed(1) : 0;

  const byCat    = {};
  mTx.filter(t => t.type === 'expense').forEach(t => { byCat[t.categoryId] = (byCat[t.categoryId] || 0) + Number(t.amount); });
  const catKeys    = Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a]);
  const catLabels  = catKeys.map(k => categories.find(c => c.id === k)?.name || 'Outros');
  const catData    = catKeys.map(k => byCat[k]);
  const catColors  = catKeys.map(k => categories.find(c => c.id === k)?.color || '#6b7280');

  const byIncCat   = {};
  mTx.filter(t => t.type === 'income').forEach(t => { byIncCat[t.categoryId] = (byIncCat[t.categoryId] || 0) + Number(t.amount); });
  const incCatKeys = Object.keys(byIncCat).sort((a, b) => byIncCat[b] - byIncCat[a]);

  const months6  = Array.from({ length: 6 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1); return d.toISOString().slice(0, 7); });
  const mLabels  = months6.map(monthLabel);
  const mIn      = months6.map(m => transactions.filter(t => t.date?.startsWith(m) && t.type === 'income').reduce((s, t) => s + Number(t.amount), 0));
  const mOut     = months6.map(m => transactions.filter(t => t.date?.startsWith(m) && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0));

  const recent       = [...transactions].sort((a, b) => b.date?.localeCompare(a.date)).slice(0, 6);
  const pendingFixed = transactions.filter(t => t.recurrence === 'fixed' && t.status === 'pending').slice(0, 4);

  const faturasData  = (cards || []).map(card => {
    const spent = transactions.filter(t => t.cardId === card.id && t.date?.startsWith(month) && t.type === 'expense' && t.status !== 'cancelled').reduce((s, t) => s + Number(t.amount), 0);
    return { ...card, spent };
  }).filter(c => c.spent > 0);
  const totalFaturas = faturasData.reduce((s, c) => s + c.spent, 0);

  const memberData = members.map(m => {
    const mx = mTx.filter(t => t.memberId === m.id);
    return { ...m, income: mx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0), expenses: mx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) };
  });

  /* ── Smart tips ─────────────────────────────────────────────── */
  const tips = [];
  const savPctNum = Number(savPct);
  if (totalIn === 0) {
    tips.push({ icon: '📋', text: `Nenhuma receita registrada em ${monthLabel(month)}. Adicione seus recebimentos para análise completa.`, color: 'var(--muted)', priority: 0 });
  } else {
    const target50 = totalIn * 0.50, target30 = totalIn * 0.30, target20 = totalIn * 0.20;
    const savAmt   = totalIn - totalOut;
    const expPct   = (totalOut / totalIn * 100).toFixed(1);
    if (savPctNum >= 20)      tips.push({ icon: '🎉', text: `Excelente! Você poupou ${savPct}% da renda em ${monthLabel(month)} (meta: 20%). Continue assim!`, color: 'var(--green)', priority: 1 });
    else if (savPctNum >= 10) tips.push({ icon: '📈', text: `Poupança em ${savPct}% — faltam ${R$(target20 - savAmt)} para atingir a meta de 20%. Pequenas reduções fazem diferença.`, color: 'var(--yellow)', priority: 2 });
    else if (savPctNum > 0)   tips.push({ icon: '⚠️', text: `Poupança baixa: ${savPct}% do ideal de 20%. Para economizar ${R$(target20)}, corte ${R$(target20 - savAmt)} nas despesas variáveis.`, color: 'var(--red)', priority: 1 });
    else                      tips.push({ icon: '🚨', text: `Despesas (${R$(totalOut)}) superam receitas (${R$(totalIn)}) em ${R$(totalOut - totalIn)}! Revise os gastos imediatamente.`, color: 'var(--red)', priority: 0 });
    tips.push({ icon: '💡', text: `Regra 50/30/20 — ${monthLabel(month)}: Necessidades ≤ ${R$(target50)} · Desejos ≤ ${R$(target30)} · Poupança ≥ ${R$(target20)}. ${totalOut > target50 ? `Seus gastos (${R$(totalOut)}) ultrapassam os 50%.` : `Gastos dentro da faixa de 50%.`}`, color: 'var(--primary)', priority: 3 });
    if (catKeys[0]) { const topCat = categories.find(x => x.id === catKeys[0]); const topAmt = byCat[catKeys[0]]; const topPct = ((topAmt / totalIn) * 100).toFixed(0); if (topCat && Number(topPct) > 20) tips.push({ icon: '📌', text: `${topCat.icon} ${topCat.name} consumiu ${topPct}% da sua renda (${R$(topAmt)}). Reduzir 20% economizaria ${R$(topAmt * 0.2)}/mês.`, color: 'var(--yellow)', priority: 2 }); }
    if (totalOut > totalIn * 0.9) tips.push({ icon: '🚨', text: `Alerta: despesas em ${expPct}% da renda. Para chegar a 80%, reduza ${R$(totalOut - totalIn * 0.8)} em gastos variáveis.`, color: 'var(--red)', priority: 1 });
  }
  if (pendingFixed.length) tips.push({ icon: '🔔', text: `${pendingFixed.length} conta(s) fixa(s) pendente(s): ${pendingFixed.map(t => t.description).join(', ')}.`, color: 'var(--yellow)', priority: 2 });
  tips.sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9));

  /* ── Layout ─────────────────────────────────────────────────── */
  const col0 = [...layout].filter(w => w.col === 0).sort((a, b) => a.order - b.order);
  const col1 = [...layout].filter(w => w.col === 1).sort((a, b) => a.order - b.order);

  const openCustomizer = () => { setDraftLayout(layout.map(w => ({ ...w }))); setShowCustomizer(true); };
  const applyDraft     = () => { setLayout(draftLayout); setShowCustomizer(false); setDraftLayout(null); };
  const cancelDraft    = () => { setShowCustomizer(false); setDraftLayout(null); };

  const moveDraft = (id, dir) => {
    setDraftLayout(prev => {
      const col   = prev.find(w => w.id === id)?.col;
      const items = [...prev.filter(w => w.col === col)].sort((a, b) => a.order - b.order);
      const idx   = items.findIndex(w => w.id === id);
      const nIdx  = idx + dir;
      if (nIdx < 0 || nIdx >= items.length) return prev;
      const ordA = items[idx].order, ordB = items[nIdx].order;
      return prev.map(w => {
        if (w.id === items[idx].id)  return { ...w, order: ordB };
        if (w.id === items[nIdx].id) return { ...w, order: ordA };
        return w;
      });
    });
  };

  const toggleDraft = id => setDraftLayout(prev => prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
  const resetDraft  = () => setDraftLayout(DEFAULT_LAYOUT.map(w => ({ ...w })));

  /* ── Widget renderer ────────────────────────────────────────── */
  const renderWidget = (id, i) => {
    const props = { key: id };
    let widget;
    switch (id) {
      case 'cashflow':     widget = <CashflowWidget labels={mLabels} income={mIn} expenses={mOut} />; break;
      case 'donut':        widget = <DonutWidget data={catData} labels={catLabels} colors={catColors} />; break;
      case 'cat-expenses': widget = <CategoryExpensesWidget categories={categories} byCat={byCat} catKeys={catKeys} totalOut={totalOut} />; break;
      case 'cat-income':   widget = <CategoryIncomeWidget categories={categories} byIncCat={byIncCat} incCatKeys={incCatKeys} totalIn={totalIn} />; break;
      case 'faturas':      widget = <FaturasWidget faturasData={faturasData} totalFaturas={totalFaturas} />; break;
      case 'tips':         widget = <TipsWidget tips={tips} />; break;
      case 'recent':       widget = <RecentWidget recent={recent} categories={categories} onViewAll={() => setView('transactions')} />; break;
      case 'by-member':    widget = <MemberSummaryWidget memberData={memberData} monthLabel={monthLabel(month)} />; break;
      case 'costs-person': widget = <CostsPerPersonWidget memberData={memberData} totalOut={totalOut} />; break;
      case 'income-person':widget = <IncomePerPersonWidget memberData={memberData} totalIn={totalIn} />; break;
      default: return null;
    }
    return (
      <motion.div key={id} custom={i} variants={widgetVariants} initial="hidden" animate="visible">
        {widget}
      </motion.div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <MonthSelector month={month} onChange={setActiveMonth} />
          <button className="btn btn-secondary" onClick={openCustomizer}>⚙️ Personalizar</button>
          <button className="btn btn-primary" onClick={() => setView('transactions')}>+ Lançamento</button>
        </div>
      </div>

      <SummaryCards totalIn={totalIn} totalOut={totalOut} balance={balance} savPct={savPct} />

      <div className="grid-dash" style={{ marginBottom: 16 }}>
        <div className="flex fcol" style={{ gap: 14 }}>
          {col0.filter(w => w.visible).map((w, i) => renderWidget(w.id, i))}
        </div>
        <div className="flex fcol" style={{ gap: 14 }}>
          {col1.filter(w => w.visible).map((w, i) => renderWidget(w.id, i + col0.filter(x => x.visible).length))}
        </div>
      </div>

      {showCustomizer && draftLayout && (
        <DashboardCustomizer
          draftLayout={draftLayout}
          onMove={moveDraft}
          onToggle={toggleDraft}
          onReset={resetDraft}
          onApply={applyDraft}
          onCancel={cancelDraft}
          renderWidget={renderWidget}
        />
      )}
    </div>
  );
}
