import React, { useState } from 'react';
import ImpactForm from './ImpactForm';
import { R$ } from '../../../core/utils/format';

const MODE_LABEL = { Single: 'Única', Installment: 'Parcelada' };

function ImpactCard({ impact, onEdit, onRemove }) {
  const isExpense  = impact.type === 'Expense';
  const modeStr    = MODE_LABEL[impact.mode] ?? impact.mode;
  const totalAmount = impact.mode === 'Installment'
    ? impact.amount * impact.installmentCount
    : impact.amount;

  const metaDetail = impact.mode === 'Installment'
    ? `${impact.installmentCount}× ${R$(impact.amount)} · ${impact.startDate.slice(0, 7)}`
    : impact.startDate.slice(0, 7);

  return (
    <div className="impact-card">
      <div className="impact-card-left">
        <span className={`impact-badge ${isExpense ? 'expense' : 'income'}`}>
          {isExpense ? '📤' : '📥'}
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="impact-desc">{impact.description}</div>
          <div className="impact-meta">
            <span className="impact-mode-tag">{modeStr}</span>
            {' · '}{metaDetail}
          </div>
        </div>
      </div>
      <div className="impact-card-right">
        <span className={`impact-amount ${isExpense ? 'expense' : 'income'}`}>
          {isExpense ? '-' : '+'}{R$(totalAmount)}
        </span>
        <div className="impact-actions">
          <button type="button" className="btn-icon" title="Editar" onClick={onEdit}>✏️</button>
          <button type="button" className="btn-icon" title="Remover" onClick={onRemove}>🗑️</button>
        </div>
      </div>
    </div>
  );
}

export default function ScenarioBuilder({ scenario, onAdd, onEdit, onRemove }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);

  const openAdd  = () => { setEditing(null); setShowForm(true); };
  const openEdit = (impact) => { setEditing(impact); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSave = (data) => {
    if (editing) onEdit(editing.id, data);
    else onAdd(data);
    closeForm();
  };

  return (
    <div className="sim-builder">
      {scenario.impacts.length === 0 ? (
        <div className="sim-empty">
          <p className="tmuted">Nenhum impacto adicionado ainda.</p>
          <p className="tmuted tsm">Clique em "+ Adicionar impacto" para começar.</p>
        </div>
      ) : (
        <div className="sim-impacts">
          {scenario.impacts.map(impact => (
            <ImpactCard
              key={impact.id}
              impact={impact}
              onEdit={() => openEdit(impact)}
              onRemove={() => onRemove(impact.id)}
            />
          ))}
        </div>
      )}

      <button type="button" className="btn btn-secondary sim-add-btn" onClick={openAdd}>
        + Adicionar impacto
      </button>

      {showForm && (
        <ImpactForm
          initial={editing}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}
    </div>
  );
}
