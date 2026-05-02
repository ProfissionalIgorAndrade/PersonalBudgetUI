import React, { useState, useEffect } from 'react';
import Modal from '../../shared/components/Modal';

/**
 * mergeCandidates — todos os perfis do lar exceto o removido (inclui usuários e membros).
 */
export default function DeleteMemberModal({
  memberToRemove,
  mergeCandidates,
  onClose,
  onConfirm,
  loading,
}) {
  const [mergeInto, setMergeInto] = useState('');

  useEffect(() => {
    if (!memberToRemove || !mergeCandidates?.length) {
      setMergeInto('');
      return;
    }
    setMergeInto((prev) => {
      if (prev && mergeCandidates.some(m => m.id === prev)) return prev;
      return mergeCandidates[0]?.id || '';
    });
  }, [memberToRemove, mergeCandidates]);

  if (!memberToRemove) return null;

  const canSubmit = mergeInto && mergeInto !== memberToRemove.id && !loading;

  return (
    <Modal
      title="Remover membro (perfil)"
      onClose={onClose}
    >
      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginTop: 0, marginBottom: 16 }}>
        Os lançamentos atribuídos a <strong style={{ color: 'var(--text)' }}>{memberToRemove.name}</strong> serão
        migrados para o perfil abaixo. Contas e cartões seguem as regras do servidor (titularidade).
      </p>

      <div className="form-group">
        <label className="form-label">Migrar dados para o perfil</label>
        <select
          className="form-select"
          value={mergeInto}
          onChange={e => setMergeInto(e.target.value)}
          disabled={loading || mergeCandidates.length === 0}
        >
          {mergeCandidates.map(m => (
            <option key={m.id} value={m.id}>
              {m.emoji} {m.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex jce gap2" style={{ gap: 8, marginTop: 20 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => canSubmit && onConfirm(mergeInto)}
          disabled={!canSubmit}
        >
          {loading ? '⏳ Removendo…' : '🗑️ Remover e migrar'}
        </button>
      </div>
    </Modal>
  );
}
