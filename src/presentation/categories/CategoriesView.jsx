import React, { useMemo, useState } from 'react';
import { uid } from '../../core/utils/format';
import { COLORS } from '../../core/constants/index';
import CategoryGroup from './components/CategoryGroup';
import CategoryForm from './components/CategoryForm';
import Modal from '../shared/components/Modal';
import PanelHeader from '../shared/components/PanelHeader';

/** Busca sem diferenciar maiúsculas nem acentos ("salario" acha "Salário"). */
export const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export default function CategoriesView({ categories, onAdd, onEdit, onDelete, titleId = 'hh-categories-title' }) {
  const [showForm, setShowForm]         = useState(false);
  const [f, setF]                       = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [query, setQuery]               = useState('');

  const openNew     = () => { setF({ name: '', icon: '📦', color: COLORS[Math.floor(Math.random() * COLORS.length)], type: 'expense' }); setShowForm(true); };
  const openEdit    = (c) => { setF(c); setShowForm(true); };
  const openForType = (type) => { setF({ name: query.trim(), icon: '📦', color: COLORS[0], type }); setShowForm(true); };
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

  const income  = categories.filter(c => c.type === 'income');
  const expense = categories.filter(c => c.type === 'expense');

  const q = fold(query);
  const visible = useMemo(
    () => (q ? categories.filter(c => fold(c.name).includes(q)) : categories),
    [categories, q],
  );
  const visIncome  = visible.filter(c => c.type === 'income');
  const visExpense = visible.filter(c => c.type === 'expense');

  const emptyFor = (label) => (q
    ? `Nenhuma categoria de ${label} com “${query.trim()}”.`
    : undefined);

  return (
    <div>
      <PanelHeader
        id={titleId}
        title="Categorias"
        sub={`${plural(income.length, 'receita', 'receitas')} · ${plural(expense.length, 'despesa', 'despesas')}`}
      >
        <button type="button" className="btn btn-primary" onClick={openNew}>+ Nova categoria</button>
      </PanelHeader>

      {categories.length > 0 && (
        <div className="hh-toolbar">
          <div className="hh-search">
            <svg className="hh-search-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <circle cx="7" cy="7" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              className="form-input hh-search-input"
              placeholder="Buscar categoria"
              aria-label="Buscar categoria"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') setQuery(''); }}
            />
          </div>
          {q && (
            <span className="hh-toolbar-count" aria-live="polite">
              {plural(visible.length, 'categoria encontrada', 'categorias encontradas')}
            </span>
          )}
        </div>
      )}

      <CategoryGroup
        title="Receitas"
        cats={visIncome}
        type="income"
        emptyText={emptyFor('receita')}
        onEdit={openEdit}
        onDelete={askDelete}
        onAddForType={openForType}
      />
      <CategoryGroup
        title="Despesas"
        cats={visExpense}
        type="expense"
        emptyText={emptyFor('despesa')}
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
