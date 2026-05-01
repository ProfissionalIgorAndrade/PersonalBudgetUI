import React, { useState } from 'react';
import { uid } from '../../core/utils/format';
import { COLORS } from '../../core/constants/index';
import CategoryGroup from './components/CategoryGroup';
import CategoryForm from './components/CategoryForm';

export default function CategoriesView({ categories, onAdd, onEdit, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [f, setF]               = useState({});

  const openNew     = () => { setF({ name: '', icon: '📦', color: COLORS[Math.floor(Math.random() * COLORS.length)], type: 'expense' }); setShowForm(true); };
  const openEdit    = (c) => { setF(c); setShowForm(true); };
  const openForType = (type) => { setF({ name: '', icon: '📦', color: COLORS[0], type }); setShowForm(true); };
  const save        = () => {
    const c = { ...f, id: f.id || uid() };
    f.id ? onEdit(c) : onAdd(c);
    setShowForm(false);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Categorias</h1>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Nova Categoria</button>
      </div>

      <CategoryGroup
        title="Receitas"
        cats={categories.filter(c => c.type === 'income')}
        type="income"
        onEdit={openEdit}
        onDelete={onDelete}
        onAddForType={openForType}
      />
      <CategoryGroup
        title="Despesas"
        cats={categories.filter(c => c.type === 'expense')}
        type="expense"
        onEdit={openEdit}
        onDelete={onDelete}
        onAddForType={openForType}
      />

      {showForm && (
        <CategoryForm f={f} onChange={setF} onSave={save} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
