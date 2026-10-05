import React from 'react';
import CategoryTile from './CategoryTile';

export default function CategoryGroup({ title, cats, type, onEdit, onDelete, onAddForType }) {
  return (
    <section className="card cat-section">
      <div className="cat-section-head">
        <h3 className="cat-section-title">
          {title}
          <span className={`badge ${type === 'income' ? 'badge-green' : 'badge-red'}`}>{cats.length}</span>
        </h3>
        <button type="button" className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: 12 }}
          onClick={() => onAddForType(type)}>＋ Adicionar</button>
      </div>
      <div className="cat-grid">
        {cats.length === 0 && (
          <div className="cat-empty">Nenhuma categoria de {title.toLowerCase()} ainda.</div>
        )}
        {cats.map(c => (
          <CategoryTile key={c.id} cat={c} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}
