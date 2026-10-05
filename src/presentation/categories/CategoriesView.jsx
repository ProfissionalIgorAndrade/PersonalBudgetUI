import React, { useState } from 'react';
import { uid } from '../../core/utils/format';
import { COLORS } from '../../core/constants/index';
import CategoryGroup from './components/CategoryGroup';
import CategoryForm from './components/CategoryForm';
import Modal from '../shared/components/Modal';

export default function CategoriesView({ categories, onAdd, onEdit, onDelete }) {
  const [showForm, setShowForm]         = useState(false);
  const [f, setF]                       = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const openNew     = () => { setF({ name: '', icon: '📦', color: COLORS[Math.floor(Math.random() * COLORS.length)], type: 'expense' }); setShowForm(true); };
  const openEdit    = (c) => { setF(c); setShowForm(true); };
  const openForType = (type) => { setF({ name: '', icon: '📦', color: COLORS[0], type }); setShowForm(true); };
  const save        = () => {
    const c = { ...f, name: (f.name || '').trim(), id: f.id || uid() };
    f.id ? onEdit(c) : onAdd(c);
    setShowForm(false);
  };
  const askDelete     = (id) => setDeleteTarget(categories.find(c => c.id === id) || null);
  const confirmDelete = () => {
    onDelete(deleteTarget.id);
    setDeleteTarget(null);
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
        onDelete={askDelete}
        onAddForType={openForType}
      />
      <CategoryGroup
        title="Despesas"
        cats={categories.filter(c => c.type === 'expense')}
        type="expense"
        onEdit={openEdit}
        onDelete={askDelete}
        onAddForType={openForType}
      />

      {showForm && (
        <CategoryForm f={f} onChange={setF} onSave={save} onClose={() => setShowForm(false)} />
      )}

      {deleteTarget && (
        <Modal title="Excluir categoria?" onClose={() => setDeleteTarget(null)}>
          <p style={{ marginBottom: 18, lineHeight: 1.5, color: 'var(--muted)' }}>
            Tem certeza que deseja excluir a categoria <strong style={{ color: 'var(--text)' }}>{deleteTarget.name}</strong>?
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex jce gap2" style={{ gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancelar</button>
            <button type="button" className="btn btn-danger" onClick={confirmDelete}>Excluir</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
