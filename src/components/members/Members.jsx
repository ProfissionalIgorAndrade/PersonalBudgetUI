import React, { useState } from 'react';
import { uid } from '../../utils/format';
import { COLORS, EMOJIS, MBR_TYPES } from '../../constants';
import Modal from '../ui/Modal';
import ColorPick from '../ui/ColorPick';

export default function Members({ members, onAdd, onEdit, onDelete }) {
  const [modal, setModal] = useState(null);
  const [f, setF] = useState({});
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const openNew = () => { setF({ name: '', type: 'me', color: COLORS[0], emoji: '👤' }); setModal('form'); };
  const save = () => { const m = { ...f, id: f.id || uid() }; f.id ? onEdit(m) : onAdd(m); setModal(null); };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Membros da Família</h1><p className="page-sub">{members.length} membro(s)</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Adicionar Membro</button>
      </div>

      <div className="grid-3">
        {members.map(m => (
          <div key={m.id} className="card" style={{ borderTop: `4px solid ${m.color}` }}>
            <div className="flex jcb" style={{ alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 42, marginBottom: 10 }}>{m.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: 17, fontFamily: 'Syne' }}>{m.name}</div>
                <div className="txxs tmuted" style={{ marginTop: 6 }}>{MBR_TYPES[m.type] || m.type}</div>
              </div>
              <div className="flex gap2" style={{ gap: 5 }}>
                <button className="btn-icon" onClick={() => { setF(m); setModal('form'); }}>✏️</button>
                <button className="btn-icon" onClick={() => onDelete(m.id)}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal === 'form' && (
        <Modal title={f.id ? 'Editar Membro' : 'Novo Membro'} onClose={() => setModal(null)}>
          <div className="form-group">
            <label className="form-label">Nome</label>
            <input className="form-input" value={f.name} onChange={e => set('name', e.target.value)} placeholder="João, Maria, Pedro..." />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select className="form-select" value={f.type} onChange={e => set('type', e.target.value)}>
              {Object.entries(MBR_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Emoji</label>
            <div className="flex fw gap2" style={{ gap: 7, flexWrap: 'wrap' }}>
              {EMOJIS.map(e => (
                <div key={e} onClick={() => set('emoji', e)} style={{ fontSize: 26, cursor: 'pointer', padding: 5, borderRadius: 8, background: f.emoji === e ? 'var(--primary-dim)' : 'var(--surface2)', border: `2px solid ${f.emoji === e ? 'var(--primary)' : 'transparent'}` }}>{e}</div>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Cor</label>
            <ColorPick val={f.color} onChange={v => set('color', v)} />
          </div>
          <div className="flex jce gap2" style={{ gap: 8, marginTop: 8 }}>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save}>💾 Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
