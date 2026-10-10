import React, { useEffect, useState } from 'react';
import { R$ } from '../../core/utils/format';
import MonthSelector from '../shared/components/MonthSelector';
import BudgetForm from './components/BudgetForm';

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
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);

  useEffect(() => {
    loadBudgets(activeMonth.month, activeMonth.year);
  }, [activeMonth.month, activeMonth.year]);

  const expenseCategories = categories.filter(c => c.type === 'expense');

  const handleSave = async (data) => {
    await budgetOps.onUpsert(data);
    setShowForm(false);
    setEditing(null);
  };

  const handleEdit = (b) => {
    setEditing(b);
    setShowForm(true);
  };

  const handleDelete = (b) => {
    if (!confirm(`Remover orçamento de "${getCatName(b.categoryId)}"?`)) return;
    budgetOps.onDelete(b.id, activeMonth.month, activeMonth.year);
  };

  const getCat = (id) => expenseCategories.find(c => c.id === id);
  const getCatName = (id) => getCat(id)?.name || 'Categoria';

  return (
    <div style={{ padding: '24px 28px', maxWidth: 800 }}>
      <div className="flex jcb aic" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>🎯 Orçamentos</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Defina limites mensais de gastos por categoria</p>
        </div>
        <div className="flex aic" style={{ gap: 12 }}>
          <MonthSelector value={activeMonth} onChange={setActiveMonth} />
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            + Novo Orçamento
          </button>
        </div>
      </div>

      {budgets.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
          <p style={{ fontSize: 14 }}>Nenhum orçamento definido para este mês.</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Clique em "Novo Orçamento" para começar.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {budgets.map(b => {
            const cat = getCat(b.categoryId);
            const p   = pct(b.spentAmount, b.limitAmount);
            const over = p >= 100;
            return (
              <div
                key={b.id}
                className="card"
                style={{ padding: '16px 20px', border: over ? '1px solid rgba(239,68,68,0.4)' : undefined }}
              >
                <div className="flex jcb aic" style={{ marginBottom: 10 }}>
                  <div className="flex aic" style={{ gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{cat?.icon || '📦'}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{cat?.name || b.categoryId}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {R$(b.spentAmount)} de {R$(b.limitAmount)}
                      </div>
                    </div>
                  </div>
                  <div className="flex aic" style={{ gap: 8 }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: barColor(p),
                    }}>
                      {p > 999 ? '>999' : Math.round(p)}%
                    </span>
                    <button className="btn-icon" title="Editar" onClick={() => handleEdit(b)}>✏️</button>
                    <button className="btn-icon" title="Remover" onClick={() => handleDelete(b)}>🗑️</button>
                  </div>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--surface2)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(p, 100)}%`,
                    background: barColor(p),
                    borderRadius: 4,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                {over && (
                  <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>
                    ⚠️ Limite ultrapassado em {R$(b.spentAmount - b.limitAmount)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <BudgetForm
          categories={categories}
          activeMonth={activeMonth}
          existing={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
