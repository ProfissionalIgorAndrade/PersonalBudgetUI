import React from 'react';

export default function MemberSection({ title, count, hint, emptyText, onAdd, note, children }) {
  return (
    <section className="card mbr-section" aria-label={title}>
      <div className="mbr-section-head">
        <div className="mbr-section-title">
          <h2>{title}</h2>
          <span className="badge badge-muted">{count}</span>
        </div>
        {onAdd && (
          <button type="button" className="btn btn-secondary" onClick={onAdd}>＋ Adicionar</button>
        )}
      </div>
      {hint && <p className="mbr-hint">{hint}</p>}
      {count === 0 ? (
        <div className="mbr-empty">{emptyText}</div>
      ) : (
        <div className="mbr-grid">{children}</div>
      )}
      {note && <p className="mbr-hint mbr-note">{note}</p>}
    </section>
  );
}
