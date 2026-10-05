import React from 'react';

/**
 * A cor da categoria entra só como acento (`--cat`): o chip do ícone é uma
 * mistura translúcida dela com a superfície do tema. Texto, fundo e borda vêm
 * dos tokens do tema, então o tile fica legível no claro e no escuro sem
 * calcular contraste.
 */
export default function CategoryTile({ cat, onEdit, onDelete }) {
  return (
    <div className="cat-tile" style={{ '--cat': cat.color }}>
      <div className="cat-chip" aria-hidden="true">{cat.icon}</div>
      <span className="cat-name" title={cat.name}>{cat.name}</span>
      {(onEdit || onDelete) && (
        <div className="cat-actions">
          {onEdit && (
            <button type="button" className="btn-icon" style={{ padding: '4px 7px', fontSize: 12 }}
              title="Editar" aria-label={`Editar ${cat.name}`} onClick={() => onEdit(cat)}>✏️</button>
          )}
          {onDelete && (
            <button type="button" className="btn-icon" style={{ padding: '4px 7px', fontSize: 12 }}
              title="Excluir" aria-label={`Excluir ${cat.name}`} onClick={() => onDelete(cat.id)}>🗑️</button>
          )}
        </div>
      )}
    </div>
  );
}
