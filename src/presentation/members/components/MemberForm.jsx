import React from 'react';
import { COLORS, EMOJIS, MBR_TYPES } from '../../../core/constants/index';
import ColorPick from '../../shared/components/ColorPick';
import Modal from '../../shared/components/Modal';

const SKIN_TONE_BASES = new Set(['👨','👩','👦','👧','👴','👵','🧑','👮','🧔','👱']);

const TONES = [
  { label: 'Amarelo', mod: '',           swatch: '#FFD700' },
  { label: 'Branco',  mod: '\u{1F3FB}',  swatch: '#FDDBB4' },
  { label: 'Pardo',   mod: '\u{1F3FD}',  swatch: '#C68642' },
  { label: 'Negro',   mod: '\u{1F3FF}',  swatch: '#5C3317' },
];

const stripTone = e => e ? e.replace(/[\u{1F3FB}-\u{1F3FF}]/u, '') : e;
const getTone   = e => ((e || '').match(/[\u{1F3FB}-\u{1F3FF}]/u) || [''])[0];

export default function MemberForm({ f, onChange, onSave, onClose }) {
  const set = (k, v) => onChange({ ...f, [k]: v });

  const baseEmoji    = stripTone(f.emoji || '');
  const currentTone  = getTone(f.emoji || '');
  const supportsTone = SKIN_TONE_BASES.has(baseEmoji);

  const selectEmoji = raw => {
    const base     = stripTone(raw);
    const keepTone = SKIN_TONE_BASES.has(base) ? currentTone : '';
    set('emoji', base + keepTone);
  };

  const selectTone = mod => set('emoji', baseEmoji + mod);

  return (
    <Modal title={f.id ? 'Editar Membro' : 'Novo Membro'} onClose={onClose}>
      <div className="form-group">
        <label className="form-label">Nome</label>
        <input className="form-input" value={f.name || ''} onChange={e => set('name', e.target.value)} placeholder="João, Maria, Pedro..." />
      </div>
      <div className="form-group">
        <label className="form-label">Tipo</label>
        <select className="form-select" value={f.type || 'me'} onChange={e => set('type', e.target.value)}>
          {Object.entries(MBR_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Emoji</label>
        <div className="flex fw gap2" style={{ gap: 7, flexWrap: 'wrap' }}>
          {EMOJIS.map(e => {
            const base    = stripTone(e);
            const preview = SKIN_TONE_BASES.has(base) ? base + currentTone : base;
            return (
              <div
                key={e}
                onClick={() => selectEmoji(e)}
                style={{
                  fontSize: 26, cursor: 'pointer', padding: 5, borderRadius: 8,
                  background: baseEmoji === base ? 'var(--primary-dim)' : 'var(--surface2)',
                  border: `2px solid ${baseEmoji === base ? 'var(--primary)' : 'transparent'}`,
                }}
              >{preview}</div>
            );
          })}
        </div>
      </div>

      {supportsTone && (
        <div className="form-group">
          <label className="form-label">Tom de Pele</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {TONES.map(t => (
              <div
                key={t.mod}
                onClick={() => selectTone(t.mod)}
                style={{
                  cursor: 'pointer', padding: '8px 12px', borderRadius: 10,
                  background: currentTone === t.mod ? 'var(--primary-dim)' : 'var(--surface2)',
                  border: `2px solid ${currentTone === t.mod ? 'var(--primary)' : 'var(--border)'}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  transition: 'border-color .15s, background .15s',
                }}
              >
                <div style={{ fontSize: 22 }}>{baseEmoji + t.mod}</div>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: t.swatch, border: '1px solid rgba(255,255,255,0.25)', flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: currentTone === t.mod ? 'var(--primary)' : 'var(--muted)', fontWeight: 600 }}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
