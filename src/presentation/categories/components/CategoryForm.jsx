import React from 'react';
import { COLORS, ICONS } from '../../../core/constants/index';
import ColorPick from '../../shared/components/ColorPick';
import Modal from '../../shared/components/Modal';

export default function CategoryForm({ f, onChange, onSave, onClose }) {
  const set = (k, v) => onChange({ ...f, [k]: v });

  return (
    <Modal title={f.id ? 'Editar Categoria' : 'Nova Categoria'} onClose={onClose}>
      <div className="form-group">
        <label className="form-label">Nome</label>
        <input className="form-input" value={f.name || ''} onChange={e => set('name', e.target.value)} placeholder="Ex: Alimentação" />
      </div>
      <div className="form-group">
        <label className="form-label">Tipo</label>
        <div className="flex gap2" style={{ gap: 8 }}>
          {[['expense', '💸 Despesa'], ['income', '💰 Receita']].map(([k, v]) => (
            <button key={k} type="button" className={`btn ${f.type === k ? 'btn-primary' : 'btn-secondary'}`} onClick={() => set('type', k)}>{v}</button>
          ))}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Ícone</label>
        <div className="flex fw gap2" style={{ gap: 6, flexWrap: 'wrap' }}>
          {ICONS.map(ic => (
            <div
              key={ic}
              onClick={() => set('icon', ic)}
              style={{
                fontSize: 22, cursor: 'pointer', padding: 5, borderRadius: 7,
                background: f.icon === ic ? 'var(--primary-dim)' : 'var(--surface2)',
                border: `2px solid ${f.icon === ic ? 'var(--primary)' : 'transparent'}`,
              }}
            >{ic}</div>
          ))}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Cor</label>
        <ColorPick val={f.color || COLORS[0]} onChange={v => set('color', v)} />
      </div>
      <div className="flex jce gap2" style={{ gap: 8, marginTop: 8 }}>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={onSave}>💾 Salvar</button>
      </div>
    </Modal>
  );
}
