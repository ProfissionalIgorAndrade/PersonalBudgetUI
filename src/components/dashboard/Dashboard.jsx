import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { R$, fdate, curMonth, monthLabel } from '../../utils/format';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import Donut from '../charts/Donut';
import BarLine from '../charts/BarLine';
import Modal from '../ui/Modal';
import MonthSelector from '../ui/MonthSelector';

const cardVariants = {
  hidden:  { opacity: 0, y: 24, scale: 0.96 },
  visible: (i) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.08, duration: 0.38, ease: [0.4, 0, 0.2, 1] },
  }),
};

const widgetVariants = {
  hidden:  { opacity: 0, y: 18 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.32 + i * 0.06, duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  }),
};

const DEFAULT_LAYOUT = [
  { id: 'cashflow',      label: 'Fluxo de Caixa',          icon: '📊', col: 0, order: 0, visible: true },
  { id: 'donut',         label: 'Gráfico de Despesas',      icon: '🍩', col: 0, order: 1, visible: true },
  { id: 'cat-expenses',  label: 'Despesas por Categoria',   icon: '📉', col: 0, order: 2, visible: true },
  { id: 'cat-income',    label: 'Receitas por Categoria',   icon: '📈', col: 0, order: 3, visible: true },
  { id: 'faturas',       label: 'Total das Faturas',        icon: '💳', col: 1, order: 0, visible: true },
  { id: 'tips',          label: 'Dicas & Alertas',          icon: '💡', col: 1, order: 1, visible: true },
  { id: 'recent',        label: 'Últimos Lançamentos',      icon: '🕐', col: 1, order: 2, visible: true },
  { id: 'by-member',     label: 'Resumo por Membro',        icon: '👥', col: 1, order: 3, visible: true },
  { id: 'costs-person',  label: 'Custos por Pessoa',        icon: '💸', col: 1, order: 4, visible: true },
  { id: 'income-person', label: 'Receitas por Pessoa',      icon: '💵', col: 1, order: 5, visible: true },
];

export default function Dashboard({ data, setView, activeMonth, setActiveMonth }) {
  const { transactions, categories, members, cards } = data;
  const [layout, setLayout] = useLocalStorage('ff_dash_layout', DEFAULT_LAYOUT);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [draftLayout, setDraftLayout] = useState(null);

  const month = activeMonth || curMonth();
  const now = new Date();

  /* ── calculations ──────────────────────────────────────────── */
  const mTx    = transactions.filter(t => t.date?.startsWith(month));
  const totalIn  = mTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = mTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance  = totalIn - totalOut;
  const savPct   = totalIn > 0 ? ((balance / totalIn) * 100).toFixed(1) : 0;

  // expenses by category
  const byCat = {};
  mTx.filter(t => t.type === 'expense').forEach(t => { byCat[t.categoryId] = (byCat[t.categoryId] || 0) + Number(t.amount); });
  const catKeys   = Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a]);
  const catLabels = catKeys.map(k => categories.find(c => c.id === k)?.name || 'Outros');
  const catData   = catKeys.map(k => byCat[k]);
  const catColors = catKeys.map(k => categories.find(c => c.id === k)?.color || '#6b7280');

  // income by category
  const byIncCat = {};
  mTx.filter(t => t.type === 'income').forEach(t => { byIncCat[t.categoryId] = (byIncCat[t.categoryId] || 0) + Number(t.amount); });
  const incCatKeys = Object.keys(byIncCat).sort((a, b) => byIncCat[b] - byIncCat[a]);

  // 6-month trend
  const months6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return d.toISOString().slice(0, 7);
  });
  const mLabels = months6.map(monthLabel);
  const mIn  = months6.map(m => transactions.filter(t => t.date?.startsWith(m) && t.type === 'income').reduce((s, t) => s + Number(t.amount), 0));
  const mOut = months6.map(m => transactions.filter(t => t.date?.startsWith(m) && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0));

  // recent & pending
  const recent       = [...transactions].sort((a, b) => b.date?.localeCompare(a.date)).slice(0, 6);
  const pendingFixed = transactions.filter(t => t.recurrence === 'fixed' && t.status === 'pending').slice(0, 4);

  // faturas do mês
  const faturasData   = (cards || []).map(card => {
    const spent = transactions
      .filter(t => t.cardId === card.id && t.date?.startsWith(month) && t.type === 'expense' && t.status !== 'cancelled')
      .reduce((s, t) => s + Number(t.amount), 0);
    return { ...card, spent };
  }).filter(c => c.spent > 0);
  const totalFaturas = faturasData.reduce((s, c) => s + c.spent, 0);

  // per-member breakdown
  const memberData = members.map(m => {
    const mx = mTx.filter(t => t.memberId === m.id);
    return {
      ...m,
      income:   mx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
      expenses: mx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
    };
  });

  // ── Smart 50/30/20 tips ──────────────────────────────────────
  const tips = [];
  const savPctNum = Number(savPct);

  if (totalIn === 0) {
    tips.push({ icon: '📋', text: `Nenhuma receita registrada em ${monthLabel(month)}. Adicione seus recebimentos para análise completa.`, color: 'var(--muted)', priority: 0 });
  } else {
    // 50/30/20 targets
    const target50 = totalIn * 0.50;
    const target30 = totalIn * 0.30;
    const target20 = totalIn * 0.20;

    // Current split (simplified: expenses split as needs vs wants heuristically)
    const expPct   = totalIn > 0 ? (totalOut / totalIn * 100).toFixed(1) : 0;
    const savAmt   = totalIn - totalOut;

    // Overall savings status
    if (savPctNum >= 20) {
      tips.push({ icon: '🎉', text: `Excelente! Você poupou ${savPct}% da renda em ${monthLabel(month)} (meta: 20%). Continue assim!`, color: 'var(--green)', priority: 1 });
    } else if (savPctNum >= 10) {
      const deficit = (target20 - savAmt);
      tips.push({ icon: '📈', text: `Poupança em ${savPct}% — faltam ${R$(deficit)} para atingir a meta de 20% (${R$(target20)}). Pequenas reduções fazem diferença.`, color: 'var(--yellow)', priority: 2 });
    } else if (savPctNum > 0) {
      const deficit = target20 - savAmt;
      tips.push({ icon: '⚠️', text: `Poupança baixa: ${savPct}% do ideal de 20%. Para economizar ${R$(target20)}, corte ${R$(deficit)} nas despesas variáveis.`, color: 'var(--red)', priority: 1 });
    } else {
      tips.push({ icon: '🚨', text: `Despesas (${R$(totalOut)}) superam receitas (${R$(totalIn)}) em ${R$(totalOut - totalIn)}! Revise os gastos imediatamente.`, color: 'var(--red)', priority: 0 });
    }

    // 50/30/20 breakdown card
    const needs30hint = totalOut > target50 ? `Seus gastos (${R$(totalOut)}) ultrapassam os 50% de necessidades (${R$(target50)}).` : `Gastos dentro da faixa de 50% (${R$(totalOut)} de ${R$(target50)}).`;
    tips.push({
      icon: '💡',
      text: `Regra 50/30/20 — ${monthLabel(month)}: Necessidades ≤ ${R$(target50)} · Desejos ≤ ${R$(target30)} · Poupança ≥ ${R$(target20)}. ${needs30hint}`,
      color: 'var(--primary)',
      priority: 3,
    });

    // Top category suggestion
    if (catKeys[0] && totalIn > 0) {
      const topCat = categories.find(x => x.id === catKeys[0]);
      const topAmt = byCat[catKeys[0]];
      const topPctOfIncome = ((topAmt / totalIn) * 100).toFixed(0);
      if (topCat && topPctOfIncome > 20) {
        tips.push({
          icon: '📌',
          text: `${topCat.icon} ${topCat.name} consumiu ${topPctOfIncome}% da sua renda (${R$(topAmt)}). Reduzir 20% nessa categoria economizaria ${R$(topAmt * 0.2)}/mês.`,
          color: 'var(--yellow)',
          priority: 2,
        });
      } else if (topCat) {
        tips.push({
          icon: '📊',
          text: `Maior despesa: ${topCat.icon} ${topCat.name} — ${R$(topAmt)} (${topPctOfIncome}% da renda). Dentro de uma proporção saudável.`,
          color: 'var(--muted)',
          priority: 4,
        });
      }
    }

    // Second category if also big
    if (catKeys[1] && totalIn > 0) {
      const secCat = categories.find(x => x.id === catKeys[1]);
      const secAmt = byCat[catKeys[1]];
      const secPct = ((secAmt / totalIn) * 100).toFixed(0);
      if (secCat && secPct > 15) {
        tips.push({
          icon: '💸',
          text: `${secCat.icon} ${secCat.name} é sua 2ª maior despesa: ${R$(secAmt)} (${secPct}% da renda). Avalie se está alinhado com suas prioridades.`,
          color: 'var(--yellow)',
          priority: 3,
        });
      }
    }

    // Expense ratio alert
    if (totalOut > totalIn * 0.9) {
      tips.push({ icon: '🚨', text: `Alerta: despesas em ${expPct}% da renda. Para chegar a 80%, reduza ${R$(totalOut - totalIn * 0.8)} em gastos variáveis.`, color: 'var(--red)', priority: 1 });
    }
  }

  // Pending fixed transactions (independent of income)
  if (pendingFixed.length) {
    tips.push({ icon: '🔔', text: `${pendingFixed.length} conta(s) fixa(s) pendente(s) em ${monthLabel(month)}: ${pendingFixed.map(t => t.description).join(', ')}.`, color: 'var(--yellow)', priority: 2 });
  }

  tips.sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9));

  /* ── layout helpers ────────────────────────────────────────── */
  const col0 = [...layout].filter(w => w.col === 0).sort((a, b) => a.order - b.order);
  const col1 = [...layout].filter(w => w.col === 1).sort((a, b) => a.order - b.order);

  // customizer draft helpers — operate on draftLayout, not layout
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

  // draft-derived columns for the modal
  const draftCol0 = draftLayout ? [...draftLayout].filter(w => w.col === 0).sort((a, b) => a.order - b.order) : [];
  const draftCol1 = draftLayout ? [...draftLayout].filter(w => w.col === 1).sort((a, b) => a.order - b.order) : [];

  /* ── widget renderer ───────────────────────────────────────── */
  const renderWidget = id => {
    switch (id) {
      case 'cashflow':
        return (
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, letterSpacing: '-0.2px' }}>Fluxo de Caixa — Últimos 6 Meses</h3>
            <BarLine labels={mLabels} income={mIn} expenses={mOut} />
          </div>
        );

      case 'donut':
        return (
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, letterSpacing: '-0.2px' }}>Gráfico de Despesas</h3>
            {catData.length
              ? <Donut data={catData} labels={catLabels} colors={catColors} />
              : <p className="tmuted tsm" style={{ padding: '20px 0', textAlign: 'center' }}>Sem despesas este mês</p>}
          </div>
        );

      case 'cat-expenses':
        return (
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, letterSpacing: '-0.2px' }}>Despesas por Categoria</h3>
            {catKeys.length === 0
              ? <p className="tmuted tsm" style={{ textAlign: 'center', padding: '12px 0' }}>Sem despesas este mês</p>
              : catKeys.slice(0, 7).map(k => {
                  const cat = categories.find(c => c.id === k);
                  const pct = totalOut > 0 ? (byCat[k] / totalOut * 100).toFixed(0) : 0;
                  return (
                    <div key={k} style={{ marginBottom: 10 }}>
                      <div className="flex jcb aic mb2">
                        <span style={{ fontSize: 12 }}>{cat?.icon} {cat?.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{R$(byCat[k])} <span className="tmuted txxs">({pct}%)</span></span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: pct + '%', background: cat?.color || 'var(--red)' }} />
                      </div>
                    </div>
                  );
                })}
          </div>
        );

      case 'cat-income':
        return (
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, letterSpacing: '-0.2px' }}>Receitas por Categoria</h3>
            {incCatKeys.length === 0
              ? <p className="tmuted tsm" style={{ textAlign: 'center', padding: '12px 0' }}>Sem receitas este mês</p>
              : incCatKeys.slice(0, 7).map(k => {
                  const cat = categories.find(c => c.id === k);
                  const pct = totalIn > 0 ? (byIncCat[k] / totalIn * 100).toFixed(0) : 0;
                  return (
                    <div key={k} style={{ marginBottom: 10 }}>
                      <div className="flex jcb aic mb2">
                        <span style={{ fontSize: 12 }}>{cat?.icon} {cat?.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>{R$(byIncCat[k])} <span className="tmuted txxs">({pct}%)</span></span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: pct + '%', background: cat?.color || 'var(--green)' }} />
                      </div>
                    </div>
                  );
                })}
          </div>
        );

      case 'faturas':
        return (
          <div className="card">
            <div className="flex jcb aic" style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700 }}>💳 Faturas do Mês</h3>
              <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne', color: 'var(--red)' }}>{R$(totalFaturas)}</span>
            </div>
            {faturasData.length === 0
              ? <p className="tmuted tsm" style={{ textAlign: 'center', padding: '12px 0' }}>Nenhuma fatura este mês</p>
              : faturasData.map(c => {
                  const pct = totalFaturas > 0 ? (c.spent / totalFaturas * 100).toFixed(0) : 0;
                  return (
                    <div key={c.id} style={{ marginBottom: 10 }}>
                      <div className="flex jcb aic mb2">
                        <span style={{ fontSize: 12 }}>{c.name} <span className="tmuted txxs">···· {c.lastDigits || '????'}</span></span>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{R$(c.spent)}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: pct + '%', background: c.color || 'var(--primary)' }} />
                      </div>
                    </div>
                  );
                })}
          </div>
        );

      case 'tips':
        return (
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, letterSpacing: '-0.2px' }}>💡 Dicas & Alertas</h3>
            {tips.map((t, i) => (
              <div key={i} className="tip-card" style={{ borderColor: t.color + '44', marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>{t.icon}</span>
                <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--text)' }}>{t.text}</p>
              </div>
            ))}
          </div>
        );

      case 'recent':
        return (
          <div className="card">
            <div className="flex jcb aic" style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700 }}>Últimos Lançamentos</h3>
              <button className="btn-icon tsm" onClick={() => setView('transactions')}>Ver todos →</button>
            </div>
            {recent.length === 0
              ? <p className="tmuted tsm">Nenhum lançamento</p>
              : recent.map(t => {
                  const cat = categories.find(c => c.id === t.categoryId);
                  return (
                    <div key={t.id} className="flex jcb aic" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div className="flex aic gap3" style={{ gap: 9 }}>
                        <span style={{ fontSize: 18 }}>{cat?.icon || '📦'}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{t.description}</div>
                          <div className="tmuted txxs">{fdate(t.date)}</div>
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 13, color: t.type === 'income' ? 'var(--green)' : 'var(--red)', fontFamily: 'Syne' }}>
                        {t.type === 'income' ? '+' : '-'}{R$(t.amount)}
                      </span>
                    </div>
                  );
                })}
          </div>
        );

      case 'by-member':
        return (
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, letterSpacing: '-0.2px' }}>Resumo por Membro — {monthLabel(month)}</h3>
            {memberData.map(m => (
              <div key={m.id} className="flex aic jcb" style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="flex aic gap3" style={{ gap: 9 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: m.color + '22', border: `2px solid ${m.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{m.emoji}</div>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="tgreen txxs">{R$(m.income)} ↑</div>
                  <div className="tred txxs">{R$(m.expenses)} ↓</div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'costs-person':
        return (
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, letterSpacing: '-0.2px' }}>Custos por Pessoa</h3>
            {memberData.filter(m => m.expenses > 0).length === 0
              ? <p className="tmuted tsm" style={{ textAlign: 'center', padding: '12px 0' }}>Sem despesas este mês</p>
              : [...memberData].filter(m => m.expenses > 0).sort((a, b) => b.expenses - a.expenses).map(m => {
                  const pct = totalOut > 0 ? (m.expenses / totalOut * 100).toFixed(0) : 0;
                  return (
                    <div key={m.id} style={{ marginBottom: 11 }}>
                      <div className="flex jcb aic mb2">
                        <span style={{ fontSize: 12 }}>{m.emoji} {m.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>{R$(m.expenses)} <span className="tmuted txxs">({pct}%)</span></span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: pct + '%', background: m.color || 'var(--red)' }} />
                      </div>
                    </div>
                  );
                })}
          </div>
        );

      case 'income-person':
        return (
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, letterSpacing: '-0.2px' }}>Receitas por Pessoa</h3>
            {memberData.filter(m => m.income > 0).length === 0
              ? <p className="tmuted tsm" style={{ textAlign: 'center', padding: '12px 0' }}>Sem receitas este mês</p>
              : [...memberData].filter(m => m.income > 0).sort((a, b) => b.income - a.income).map(m => {
                  const pct = totalIn > 0 ? (m.income / totalIn * 100).toFixed(0) : 0;
                  return (
                    <div key={m.id} style={{ marginBottom: 11 }}>
                      <div className="flex jcb aic mb2">
                        <span style={{ fontSize: 12 }}>{m.emoji} {m.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>{R$(m.income)} <span className="tmuted txxs">({pct}%)</span></span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: pct + '%', background: m.color || 'var(--green)' }} />
                      </div>
                    </div>
                  );
                })}
          </div>
        );

      default: return null;
    }
  };

  const summaries = [
    { label: 'Receitas', val: totalIn,  icon: '📈', color: 'var(--green)',   glowBg: 'rgba(74,222,128,0.09)',   accentColor: '#4ade80' },
    { label: 'Despesas', val: totalOut, icon: '📉', color: 'var(--red)',     glowBg: 'rgba(248,113,113,0.09)', accentColor: '#f87171' },
    { label: 'Saldo',    val: balance,  icon: '💰',
      color:       balance >= 0 ? 'var(--green)' : 'var(--red)',
      glowBg:      balance >= 0 ? 'rgba(74,222,128,0.09)' : 'rgba(248,113,113,0.09)',
      accentColor: balance >= 0 ? '#4ade80' : '#f87171',
    },
    { label: 'Poupança', val: null,     icon: '🏦', color: 'var(--primary)', glowBg: 'rgba(45,212,191,0.09)',  accentColor: '#2dd4bf', extra: savPct + '%' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <MonthSelector month={month} onChange={setActiveMonth} />
          <button className="btn btn-secondary" onClick={openCustomizer}>⚙️ Personalizar</button>
          <button className="btn btn-primary" onClick={() => setView('transactions')}>+ Lançamento</button>
        </div>
      </div>

      {/* ── summary cards ─────────────────────────────────────── */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {summaries.map((s, i) => (
          <motion.div key={i} className="card"
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            style={{
            position: 'relative',
            overflow: 'hidden',
            borderTop: `2px solid ${s.accentColor}40`,
            padding: '20px 22px 22px',
          }}>
            {/* corner glow */}
            <div style={{
              position: 'absolute',
              top: -50, right: -50,
              width: 150, height: 150,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${s.glowBg} 0%, transparent 70%)`,
              pointerEvents: 'none',
            }} />
            {/* icon badge */}
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 11,
              background: s.glowBg,
              border: `1px solid ${s.accentColor}25`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 19,
              marginBottom: 16,
            }}>
              {s.icon}
            </div>
            {/* label */}
            <div style={{
              fontSize: 10.5,
              color: 'var(--muted)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.9px',
              marginBottom: 6,
            }}>
              {s.label}
            </div>
            {/* value */}
            <div style={{
              fontSize: 26,
              fontWeight: 800,
              fontFamily: 'Syne',
              color: s.color,
              letterSpacing: '-0.6px',
              lineHeight: 1,
            }}>
              {s.extra || R$(s.val)}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── main 2-column widget grid ─────────────────────────── */}
      <div className="grid-dash" style={{ marginBottom: 16 }}>
        <div className="flex fcol" style={{ gap: 14 }}>
          {col0.filter(w => w.visible).map((w, i) => (
            <motion.div key={w.id} custom={i} variants={widgetVariants} initial="hidden" animate="visible">
              {renderWidget(w.id)}
            </motion.div>
          ))}
        </div>
        <div className="flex fcol" style={{ gap: 14 }}>
          {col1.filter(w => w.visible).map((w, i) => (
            <motion.div key={w.id} custom={i + col0.filter(x => x.visible).length} variants={widgetVariants} initial="hidden" animate="visible">
              {renderWidget(w.id)}
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── layout customizer modal ───────────────────────────── */}
      {showCustomizer && draftLayout && (
        <Modal title="⚙️ Personalizar Dashboard" onClose={cancelDraft}>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: -10, marginBottom: 16 }}>
            Ajuste a ordem e visibilidade dos blocos. Veja o resultado no preview antes de aplicar.
          </p>

          {/* editor columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              { title: '◧ Coluna Esquerda', items: draftCol0 },
              { title: '◨ Coluna Direita',  items: draftCol1 },
            ].map(({ title, items }, ci) => (
              <div key={ci}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                  {title}
                </div>
                {items.map((w, idx) => (
                  <div key={w.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', marginBottom: 5, borderRadius: 9,
                    background: w.visible ? 'var(--surface2)' : 'transparent',
                    border: '1px solid var(--border)',
                    opacity: w.visible ? 1 : 0.4,
                    transition: 'opacity .2s, background .2s',
                  }}>
                    <span style={{ fontSize: 14 }}>{w.icon}</span>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{w.label}</span>
                    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <button className="btn-icon" style={{ padding: '2px 5px', fontSize: 11 }} onClick={() => moveDraft(w.id, -1)} disabled={idx === 0}>↑</button>
                      <button className="btn-icon" style={{ padding: '2px 5px', fontSize: 11 }} onClick={() => moveDraft(w.id, 1)} disabled={idx === items.length - 1}>↓</button>
                      <button
                        className="btn-icon"
                        style={{ padding: '3px 7px', fontSize: 14, color: w.visible ? 'var(--primary)' : 'var(--muted)' }}
                        title={w.visible ? 'Ocultar' : 'Mostrar'}
                        onClick={() => toggleDraft(w.id)}
                      >{w.visible ? '👁' : '🙈'}</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* ── live preview ──────────────────────────────────── */}
          <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>
              👁 Pré-visualização
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'var(--bg)', borderRadius: 10, padding: 12, border: '1px solid var(--border)' }}>
              {[draftCol0, draftCol1].map((col, ci) => (
                <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {col.map(w => (
                    <div key={w.id} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 8px', borderRadius: 7,
                      background: w.visible ? 'var(--surface)' : 'transparent',
                      border: `1px solid ${w.visible ? 'var(--border)' : 'var(--border)'}`,
                      opacity: w.visible ? 1 : 0.3,
                      transition: 'all .2s',
                    }}>
                      <span style={{ fontSize: 12 }}>{w.icon}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: w.visible ? 'var(--text)' : 'var(--muted)' }}>{w.label}</span>
                      {!w.visible && <span style={{ fontSize: 9, color: 'var(--muted)', marginLeft: 'auto' }}>oculto</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* ── footer ────────────────────────────────────────── */}
          <div className="flex jcb aic" style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', gap: 8 }}>
            <button className="btn btn-secondary" onClick={resetDraft}>↺ Restaurar padrão</button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={cancelDraft}>Cancelar</button>
              <button className="btn btn-primary" onClick={applyDraft}>✓ Aplicar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
