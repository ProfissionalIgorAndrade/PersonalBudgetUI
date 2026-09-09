import React from 'react';
import { inkOn } from '../../../core/constants/palette';

export default function CategoryGroup({ title, cats, type, onEdit, onDelete, onAddForType }) {
  return (
    <div className="card mb4" style={{ marginBottom: 14, overflow: 'hidden' }}>
      <div className="flex jcb aic mb3" style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title} <span className="tmuted" style={{ fontWeight: 400 }}>({cats.length})</span>
        </h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(175px,1fr))', gap: 8 }}>
        {cats.map(c => (
          <div
            key={c.id}
            className="card-sm flex aic"
            style={{
              gap: 8, padding: 9, minWidth: 0, overflow: 'hidden',
              // Fundo na cor da categoria, com borda e texto na tinta que
              // contrasta com ela — preto sobre cores claras, branco sobre
              // escuras. A escolha vem da luminância relativa, não do olho:
              // os tons médios são justamente onde o chute erra.
              background: c.color,
              border: `1px solid ${inkOn(c.color)}`,
              color: inkOn(c.color),
            }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: 7,
              // Vidro sobre a própria cor, para o ícone não flutuar solto.
              background: inkOn(c.color) === '#ffffff' ? 'rgb(255 255 255 / 0.16)' : 'rgb(0 0 0 / 0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
            }}>{c.icon}</div>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{c.name}</span>
            <div className="flex gap2" style={{ gap: 2, flexShrink: 0 }}>
              <button className="btn-icon" style={{ padding: '3px 6px', fontSize: 11, color: inkOn(c.color), background: 'transparent', borderColor: 'transparent' }} onClick={() => onEdit(c)}>✏️</button>
              <button className="btn-icon" style={{ padding: '3px 6px', fontSize: 11, color: inkOn(c.color), background: 'transparent', borderColor: 'transparent' }} onClick={() => onDelete(c.id)}>🗑️</button>
            </div>
          </div>
        ))}
        <div
          className="card-sm flex aic"
          style={{ gap: 9, border: '1px dashed var(--border)', padding: 10, cursor: 'pointer', opacity: .6 }}
          onClick={() => onAddForType(type)}
        >
          <span style={{ fontSize: 18 }}>＋</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Adicionar</span>
        </div>
      </div>
    </div>
  );
}
