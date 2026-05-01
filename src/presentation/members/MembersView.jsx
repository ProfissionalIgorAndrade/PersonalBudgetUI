import React, { useState } from 'react';
import { uid } from '../../core/utils/format';
import { COLORS } from '../../core/constants/index';
import MemberCard from './components/MemberCard';
import MemberForm from './components/MemberForm';

export default function MembersView({ members, onAdd, onEdit, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [f, setF]               = useState({});

  const openNew  = () => { setF({ name: '', type: 'me', color: COLORS[0], emoji: '👤' }); setShowForm(true); };
  const save     = () => {
    const m = { ...f, id: f.id || uid() };
    f.id ? onEdit(m) : onAdd(m);
    setShowForm(false);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Membros da Família</h1>
          <p className="page-sub">{members.length} membro(s)</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Adicionar Membro</button>
      </div>

      <div className="grid-3">
        {members.map(m => (
          <MemberCard
            key={m.id}
            member={m}
            onEdit={() => { setF(m); setShowForm(true); }}
            onDelete={() => onDelete(m.id)}
          />
        ))}
      </div>

      {showForm && (
        <MemberForm f={f} onChange={setF} onSave={save} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
