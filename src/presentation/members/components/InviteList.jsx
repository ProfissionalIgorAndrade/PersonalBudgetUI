import React from 'react';

/** Cabeçalho, estados (carregando, erro, vazio) e moldura comum às duas listas. */
export default function InviteList({ title, state, emptyText, children }) {
  const { items, loading, error } = state;
  return (
    <div className="mbr-invite-block">
      <h3 className="mbr-invite-sub">{title}</h3>
      <div aria-live="polite">
        {loading && <p className="mbr-invite-msg">Carregando…</p>}
        {!loading && error && <p className="mbr-invite-msg" style={{ color: 'var(--red)' }}>{error}</p>}
        {!loading && !error && items.length === 0 && <p className="mbr-invite-msg">{emptyText}</p>}
      </div>
      {!loading && !error && items.length > 0 && (
        <ul className="mbr-invite-list">{children}</ul>
      )}
    </div>
  );
}
