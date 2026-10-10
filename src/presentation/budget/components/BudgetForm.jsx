import React, { useState } from 'react';
import Modal from '../../shared/components/Modal';
import CurrencyInput from '../../shared/components/CurrencyInput';

export default function BudgetForm({ categories, activeMonth, onSave, onClose, existing }) {
  const [categoryId, setCategoryId] = useState(existing?.categoryId || '');
  const [limit, setLimit]           = useState(existing?.limitAmount || 0);

  const [activeYear, activeMonthNum] = (activeMonth || '').split('-').map(Number);
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const handleSave = () => {
    if (!categoryId) return;
    if (limit <= 0) return;
    onSave({
      categoryId,
      month: activeMonthNum,
      year:  activeYear,
      limitAmount: limit,
    });
  };

  return (
    <Modal title={existing ? 'Editar Orçamento' : 'Novo Orçamento'} onClose={onClose} confirmOnOverlay>
      <div className="form-group">
        <label className="form-label">Categoria</label>
        <select
          className="form-input"
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
          disabled={!!existing}
        >
          <option value="">Selecione uma categoria</option>
          {expenseCategories.map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Limite mensal (R$)</label>
        <CurrencyInput value={limit} onChange={setLimit} placeholder="0,00" required />
      </div>
      <div className="flex jce gap2" style={{ gap: 8, marginTop: 8 }}>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!categoryId || limit <= 0}
        >
          💾 Salvar
        </button>
      </div>
    </Modal>
  );
}
