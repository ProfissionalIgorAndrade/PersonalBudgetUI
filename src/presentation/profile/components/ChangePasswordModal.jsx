import React, { useState } from 'react';
import Modal from '../../shared/components/Modal';
import { changePassword } from '../../../data/repositories/authRepository';

const MIN_LENGTH = 8;

export default function ChangePasswordModal({ onClose, onSuccess }) {
  const [current, setCurrent] = useState('');
  const [next, setNext]       = useState('');
  const [repeat, setRepeat]   = useState('');
  const [reveal, setReveal]   = useState(false);
  const [error, setError]     = useState('');
  const [saving, setSaving]   = useState(false);

  // Client-side checks mirror the server's, purely to fail fast. The server
  // stays the authority; anything it rejects surfaces through `error`.
  const localError =
    next && next.length < MIN_LENGTH
      ? `A nova senha deve ter ao menos ${MIN_LENGTH} caracteres.`
      : repeat && next !== repeat
        ? 'As senhas não conferem.'
        : '';

  const canSubmit =
    Boolean(current) && Boolean(next) && Boolean(repeat) && !localError && !saving;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    setError('');
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      // Only here, after the backend confirms, does the modal close.
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Não foi possível alterar a senha.');
      setSaving(false);
    }
  };

  return (
    <Modal title="Alterar Senha" onClose={() => !saving && onClose()} confirmOnOverlay>
      <form onSubmit={submit}>
        {error && (
          <div style={{
            marginBottom: 14,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'color-mix(in srgb, var(--red) 18%, transparent)',
            border: '1px solid color-mix(in srgb, var(--red) 35%, transparent)',
            color: 'var(--text)',
            fontSize: 13,
            lineHeight: 1.45,
          }}>
            {error}
          </div>
        )}

        <fieldset disabled={saving} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
          <div className="form-group">
            <label className="form-label">Senha atual *</label>
            <input
              className="form-input"
              type={reveal ? 'text' : 'password'}
              autoComplete="current-password"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nova senha *</label>
            <input
              className="form-input"
              type={reveal ? 'text' : 'password'}
              autoComplete="new-password"
              value={next}
              onChange={e => setNext(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Repita a nova senha *</label>
            <input
              className="form-input"
              type={reveal ? 'text' : 'password'}
              autoComplete="new-password"
              value={repeat}
              onChange={e => setRepeat(e.target.value)}
              required
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)', marginBottom: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={reveal} onChange={e => setReveal(e.target.checked)} />
            Mostrar senhas
          </label>

          <div style={{ fontSize: 12, color: localError ? 'var(--red)' : 'var(--muted)', minHeight: 18, marginBottom: 8 }}>
            {localError || `Mínimo de ${MIN_LENGTH} caracteres.`}
          </div>
        </fieldset>

        <div className="flex jce gap2" style={{ gap: 8, marginTop: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            {saving ? '⏳ Alterando…' : '🔒 Alterar Senha'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
