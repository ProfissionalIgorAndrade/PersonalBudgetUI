import React, { useState } from 'react';
import { COLORS } from '../../../core/constants/index';
import {
  AVATAR_GROUPS, SKIN_TONES, applyTone, stripTone, getTone, supportsTone, defaultAvatarFor,
} from '../../../core/constants/avatars';
import ColorPick from '../../shared/components/ColorPick';
import Modal from '../../shared/components/Modal';
import MemberTile from './MemberTile';

export default function MemberForm({ f, onChange, onSave, onClose }) {
  const [touched, setTouched] = useState(false);
  const set = (k, v) => onChange({ ...f, [k]: v });

  const nameOk       = (f.name || '').trim().length > 0;
  const emoji        = f.emoji || defaultAvatarFor(f.type);
  const baseEmoji    = stripTone(emoji);
  const currentTone  = getTone(emoji);
  const toneEnabled  = supportsTone(emoji);

  const preview = {
    ...f,
    name:  nameOk ? f.name.trim() : 'Nome do membro',
    emoji,
    color: f.color || COLORS[0],
  };

  const submit = () => {
    setTouched(true);
    if (nameOk) onSave();
  };

  return (
    <Modal title={f.id ? 'Editar Membro' : 'Novo Membro'} onClose={onClose} confirmOnOverlay>
      <div className="mbr-preview" aria-label="Prévia do membro">
        <MemberTile member={preview} />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="member-name">Nome</label>
        <input
          id="member-name"
          className="form-input"
          value={f.name || ''}
          onChange={e => set('name', e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="João, Maria, Pedro..."
          aria-invalid={touched && !nameOk}
        />
        {touched && !nameOk && (
          <div className="txxs" role="alert" style={{ color: 'var(--red)', marginTop: 6 }}>Informe um nome para o membro.</div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Avatar</label>
        {AVATAR_GROUPS.map(g => (
          <div key={g.id} style={{ marginBottom: 10 }}>
            <div className="txxs tmuted" style={{ marginBottom: 6 }}>{g.label}</div>
            <div className="icon-grid" role="group" aria-label={g.label}>
              {g.items.map(base => (
                <button
                  key={base}
                  type="button"
                  className="icon-opt"
                  aria-pressed={baseEmoji === base}
                  aria-label={`Avatar ${base}`}
                  onClick={() => set('emoji', applyTone(base, currentTone))}
                >{applyTone(base, currentTone)}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {toneEnabled && (
        <div className="form-group">
          <label className="form-label">Tom de pele</label>
          <div className="seg" role="group" aria-label="Tom de pele">
            {SKIN_TONES.map(t => (
              <button
                key={t.id}
                type="button"
                title={t.label}
                aria-label={`Tom ${t.label}`}
                aria-pressed={currentTone === t.mod}
                onClick={() => set('emoji', applyTone(baseEmoji, t.mod))}
              >{applyTone(baseEmoji, t.mod)}</button>
            ))}
          </div>
        </div>
      )}

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
