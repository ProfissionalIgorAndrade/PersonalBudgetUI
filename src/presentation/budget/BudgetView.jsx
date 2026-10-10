import React, { useEffect, useState } from 'react';
import { R$ } from '../../core/utils/format';
import MonthSelector from '../shared/components/MonthSelector';
import CurrencyInput from '../shared/components/CurrencyInput';
import * as budgetRepo from '../../data/repositories/budgetRepository';

function pct(spent, limit) {
  if (!limit) return 0;
  return Math.min((spent / limit) * 100, 999);
}

function barColor(p) {
  if (p >= 100) return 'var(--red)';
  if (p >= 70)  return '#fbbf24';
  return '#4ade80';
}

export default function BudgetView({
  budgets, categories, activeMonth, setActiveMonth,
  loadBudgets, budgetOps,
}) {
  const [editingCatId, setEditingCatId] = useState(null);
  const [editValue,    setEditValue]    = useState(0);
  const [copying,      setCopying]      = useState(false);

  const [activeYear, activeMonthNum] = (activeMonth || '').split('-').map(Number);

  useEffect(() => {
    if (activeYear && activeMonthNum) loadBudgets(activeMonthNum, activeYear);
  }, [activeMonth]);

  const expenseCategories = (categories || []).filter(c => c.type === 'expense');
  const hasAnyLimit = budgets.length > 0;

  const rows = expenseCategories.map(cat => ({
    cat,
    budget: budgets.find(b => b.categoryId === cat.id) ?? null,
  }));

  const startEdit = (cat, budget) => {
    setEditingCatId(cat.id);
    setEditValue(budget?.limitAmount ?? 0);
  };

  const cancelEdit = () => { setEditingCatId(null); setEditValue(0); };

  const handleSave = async (cat, budget) => {
    if (editValue <= 0) {
      if (budget) await budgetOps.onDelete(budget.id, activeMonthNum, activeYear);
    } else {
      await budgetOps.onUpsert({
        categoryId:  cat.id,
        month:       activeMonthNum,
        year:        activeYear,
        limitAmount: editValue,
      });
    }
    setEditingCatId(null);
    setEditValue(0);
  };

  const handleCopyFromPrevious = async () => {
    setCopying(true);
    try {
      const prevYear  = activeMonthNum === 1 ? activeYear - 1 : activeYear;
      const prevMonth = activeMonthNum === 1 ? 12 : activeMonthNum - 1;
      const prev = await budgetRepo.listBudgets(prevMonth, prevYear);
      const toCreate = (prev || []).filter(pb => !budgets.find(b => b.categoryId === pb.categoryId));
      for (const pb of toCreate) {
        await budgetRepo.upsertBudget({
          categoryId:  pb.categoryId,
          month:       activeMonthNum,
          year:        activeYear,
          limitAmount: pb.limitAmount,
        });
      }
      await loadBudgets(activeMonthNum, activeYear);
    } finally {
      setCopying(false);
    }
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>

      {/* Header */}
      <div className="flex jcb aic" style={{ marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>🎯 Orçamentos</h1>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>
            Limites mensais por categoria · clique em ✏️ para editar
          </p>
        </div>
        <div className="flex aic" style={{ gap: 8 }}>
          {!hasAnyLimit && (
            <button
              className="btn btn-secondary"
              onClick={handleCopyFromPrevious}
              disabled={copying}
              style={{ fontSize: 12 }}
            >
              {copying ? '⏳' : '📋'} Copiar mês anterior
            </button>
          )}
          <MonthSelector month={activeMonth} onChange={setActiveMonth} />
        </div>
      </div>

      {/* Grid */}
      {expenseCategories.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          <p style={{ fontSize: 14 }}>Nenhuma categoria de despesa cadastrada.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: 12,
        }}>
          {rows.map(({ cat, budget }) => {
            const spent     = budget?.spentAmount ?? 0;
            const limit     = budget?.limitAmount ?? 0;
            const p         = pct(spent, limit);
            const over      = limit > 0 && p >= 100;
            const isEditing = editingCatId === cat.id;
            const color     = barColor(p);

            return (
              <div
                key={cat.id}
                className="card"
                style={{
                  padding: '14px 16px',
                  border: over
                    ? '1px solid rgba(239,68,68,0.35)'
                    : limit === 0
                    ? '1px dashed var(--border)'
                    : undefined,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {/* Category header */}
                <div className="flex jcb aic" style={{ gap: 8 }}>
                  <div className="flex aic" style={{ gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{cat.icon || '📦'}</span>
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {cat.name}
                    </span>
                  </div>
                  {!isEditing && (
                    <button
                      className="btn-icon"
                      title="Definir limite"
                      onClick={() => startEdit(cat, budget)}
                      style={{ fontSize: 13, flexShrink: 0, opacity: 0.6 }}
                    >
                      ✏️
                    </button>
                  )}
                </div>

                {/* Progress bar — only when there's a limit */}
                {limit > 0 && !isEditing && (
                  <div>
                    <div style={{
                      height: 5, borderRadius: 3,
                      background: 'var(--surface2)', overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(p, 100)}%`,
                        background: color,
                        borderRadius: 3,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                )}

                {/* Amount row or inline edit */}
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <CurrencyInput
                      value={editValue}
                      onChange={setEditValue}
                      className="form-input"
                      style={{ fontSize: 13, padding: '5px 8px' }}
                    />
                    <div className="flex" style={{ gap: 6 }}>
                      <button
                        className="btn btn-primary"
                        style={{ flex: 1, fontSize: 12, padding: '5px 0' }}
                        onClick={() => handleSave(cat, budget)}
                      >
                        Salvar
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ flex: 1, fontSize: 12, padding: '5px 0' }}
                        onClick={cancelEdit}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex jcb aic">
                    {limit > 0 ? (
                      <>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {R$(spent)} <span style={{ opacity: 0.5 }}>/ {R$(limit)}</span>
                        </span>
                        <span style={{
                          fontSize: 12, fontWeight: 700, color,
                        }}>
                          {p > 999 ? '>999' : Math.round(p)}%
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
                        Sem limite definido
                      </span>
                    )}
                  </div>
                )}

                {/* Over-limit warning */}
                {over && !isEditing && (
                  <div style={{ fontSize: 10, color: 'var(--red)', marginTop: -4 }}>
                    ⚠️ Excedido em {R$(spent - limit)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
