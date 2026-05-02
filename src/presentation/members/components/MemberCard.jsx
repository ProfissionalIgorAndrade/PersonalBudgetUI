import React from 'react';

export default function MemberCard({ member, onEdit, onDelete, showDelete = true }) {
  return (
    <div className="card" style={{ borderTop: `4px solid ${member.color}` }}>
      <div className="flex jcb" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 42, marginBottom: 10 }}>{member.emoji}</div>
          <div style={{ fontWeight: 700, fontSize: 17, fontFamily: 'Syne' }}>{member.name}</div>
        </div>
        <div className="flex gap2" style={{ gap: 5 }}>
          <button type="button" className="btn-icon" onClick={onEdit} title="Editar">✏️</button>
          {showDelete && onDelete && (
            <button type="button" className="btn-icon" onClick={onDelete} title="Excluir">🗑️</button>
          )}
        </div>
      </div>
    </div>
  );
}
