import React from 'react';
import { MBR_TYPES } from '../../../core/constants/index';

export default function MemberCard({ member, onEdit, onDelete }) {
  return (
    <div className="card" style={{ borderTop: `4px solid ${member.color}` }}>
      <div className="flex jcb" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 42, marginBottom: 10 }}>{member.emoji}</div>
          <div style={{ fontWeight: 700, fontSize: 17, fontFamily: 'Syne' }}>{member.name}</div>
          <div className="txxs tmuted" style={{ marginTop: 6 }}>{MBR_TYPES[member.type] || member.type}</div>
        </div>
        <div className="flex gap2" style={{ gap: 5 }}>
          <button className="btn-icon" onClick={onEdit}>✏️</button>
          <button className="btn-icon" onClick={onDelete}>🗑️</button>
        </div>
      </div>
    </div>
  );
}
