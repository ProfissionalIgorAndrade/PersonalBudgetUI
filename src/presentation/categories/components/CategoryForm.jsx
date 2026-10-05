import React, { useState } from 'react';
import { COLORS, ICONS } from '../../../core/constants/index';
import ColorPick from '../../shared/components/ColorPick';
import Modal from '../../shared/components/Modal';
import CategoryTile from './CategoryTile';

export default function CategoryForm({ f, onChange, onSave, onClose }) {
  const [touched, setTouched] = useState(false);
  const set = (k, v) => onChange({ ...f, [k]: v });

  const nameOk = (f.name || '').trim().length > 0;
  const preview = {
    ...f,
    name:  nameOk ? f.name.trim() : 'Nome da categoria',
    icon:  f.icon || '📦',
    color: f.color || COLORS[0],
  };

  const submit = () => {
    setTouched(true);
    if (nameOk) onSave();
  };

  return (
    <Modal title={f.id ? 'Editar Categoria' : 'Nova Categoria'} onClose={onClose} confirmOnOverlay>
      <div className="cat-preview" aria-label="Prévia da categoria">
        <CategoryTile cat={preview} />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="category-name">Nome</label>
        <input
          id="category-name"
          className="form-input"
          value={f.name || ''}
          onChange={e => set('name', e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="Ex: Alimentação"
          aria-invalid={touched && !nameOk}
        />
        {touched && !nameOk && (
          <div className="txxs" role="alert" style={{ color: 'var(--red)', marginTop: 6 }}>Informe um nome para a categoria.</div>
        )}
      </div>
      <div className="form-group">
        <label className="form-label">Tipo</label>
        <div className="seg" role="group" aria-label="Tipo">
          {[['expense', '💸 Despesa'], ['income', '💰 Receita']].map(([k, v]) => (
            <button key={k} type="button" aria-pressed={f.type === k} onClick={() => set('type', k)}>{v}</button>
          ))}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Ícone</label>
        <div className="icon-grid">
          {ICONS.map(ic => (
            <button
              key={ic}
              type="button"
              className="icon-opt"
              aria-pressed={f.icon === ic}
              aria-label={`Ícone ${ic}`}
              onClick={() => set('icon', ic)}
            >{ic}</button>
          ))}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Cor</label>
        <ColorPick val={f.color || COLORS[0]} onChange={v => set('color', v)} />
      </div>
      <div className="flex jce gap2" style={{ gap: 8, marginTop: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={!nameOk}>💾 Salvar</button>
      </div>
    </Modal>
  );
}
