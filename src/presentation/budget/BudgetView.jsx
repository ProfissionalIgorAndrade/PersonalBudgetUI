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

  const rows = expenseCategories.map(cat => ({
    cat,
    budget: budgets.find(b => b.categoryId === cat.id) ?? null,
  }));

  const hasAnyLimit = budgets.length > 0;

  const startEdit = (cat, budget) => {
    setEditingCatId(cat.id);
    setEditValue(budget?.limitAmount ?? 0);
  };

  const cancelEdit = () => {
    setEditingCatId(null);
    setEditValue(0);
  };

  const handleSave = async (cat, budget) => {
    if (editValue <= 0) {
      if (budget) await budgetOps.onDelete(budget.id, activeMonthNum, activeYear);
    } else {
      await budgetOps.onUpsert({
        categoryId: cat.id,
        month: activeMonthNum,
        year:  activeYear,
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
          categoryId: pb.categoryId,
          month: activeMonthNum,
          year:  activeYear,
          limitAmount: pb.limitAmount,
        });
      }
      await loadBudgets(activeMonthNum, activeYear);
    } finally {
      setCopying(false);
    }
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 860 }}>
      <div className="flex jcb aic" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>🎯 Orçamentos</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Limites mensais de gasto por categoria</p>
        </div>
        <div className="flex aic" style={{ gap: 10 }}>
          {!hasAnyLimit && (
            <button
              className="btn btn-secondary"
              onClick={handleCopyFromPrevious}
              disabled={copying}
              style={{ fontSize: 12 }}
            >
              {copying ? '⏳ Copiando...' : '📋 Copiar do mês anterior'}
            </button>
          )}
          <MonthSelector month={activeMonth} onChange={setActiveMonth} />
        </div>
      </div>

      {expenseCategories.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          <p style={{ fontSize: 14 }}>Nenhuma categoria de despesa cadastrada.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(({ cat, budget }) => {
            const spent  = budget?.spentAmount  ?? 0;
            const limit  = budget?.limitAmount  ?? 0;
            const p      = pct(spent, limit);
            const over   = limit > 0 && p >= 100;
            const isEditing = editingCatId === cat.id;

            return (
              <div
                key={cat.id}
                className="card"
                style={{
                  padding: '14px 18px',
                  border: over ? '1px solid rgba(239,68,68,0.4)' : undefined,
                  opacity: limit === 0 && !isEditing ? 0.7 : 1,
                }}
              >
                <div className="flex aic" style={{ gap: 12 }}>
                  <span style={{ fontSize: 20, minWidth: 28, textAlign: 'center' }}>
                    {cat.icon || '📦'}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex jcb aic" style={{ marginBottom: limit > 0 ? 6 : 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{cat.name}</span>

                      {isEditing ? (
                        <div className="flex aic" style={{ gap: 6 }}>
                          <CurrencyInput
                            value={editValue}
                            onChange={setEditValue}
                            style={{ width: 130, fontSize: 12, padding: '4px 8px' }}
                            className="form-input"
                          />
                          <button
                            className="btn btn-primary"
                            style={{ fontSize: 11, padding: '4px 10px' }}
                            onClick={() => handleSave(cat, budget)}
                          >
                            Salvar
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: 11, padding: '4px 10px' }}
                            onClick={cancelEdit}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex aic" style={{ gap: 10 }}>
                          {limit > 0 ? (
                            <>
                              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                                {R$(spent)} de {R$(limit)}
                              </span>
                              <span style={{
                                fontSize: 12, fontWeight: 700,
                                color: barColor(p),
                                minWidth: 36, textAlign: 'right',
                              }}>
                                {p > 999 ? '>999' : Math.round(p)}%
                              </span>
                            </>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
                              Sem limite
                            </span>
                          )}
                          <button
                            className="btn-icon"
                            title="Definir limite"
                            onClick={() => startEdit(cat, budget)}
                            style={{ fontSize: 14 }}
                          >
                            ✏️
                          </button>
                        </div>
                      )}
                    </div>

                    {limit > 0 && !isEditing && (
                      <div style={{ height: 6, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(p, 100)}%`,
                          background: barColor(p),
                          borderRadius: 3,
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                    )}

                    {over && !isEditing && (
                      <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>
                        ⚠️ Ultrapassado em {R$(spent - limit)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
