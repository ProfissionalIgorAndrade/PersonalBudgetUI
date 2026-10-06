import React, { useState } from 'react';
import Modal from '../../shared/components/Modal';

/**
 * mergeCandidates — todos os perfis do lar exceto o removido (inclui usuários e membros).
 *
 * `choice` guarda só o que a pessoa escolheu; o destino efetivo é derivado
 * dele e da lista atual, caindo no primeiro candidato quando a escolha não
 * existe mais (ou ainda não foi feita).
 */
export default function DeleteMemberModal({
  memberToRemove,
  mergeCandidates,
  onClose,
  onConfirm,
  loading,
}) {
  const [choice, setChoice] = useState('');

  if (!memberToRemove) return null;

  const mergeInto = mergeCandidates.some(m => m.id === choice)
    ? choice
    : (mergeCandidates[0]?.id || '');
  const canSubmit = !!mergeInto && !loading;

  return (
    <Modal title="Remover membro?" onClose={onClose}>
      <p style={{ marginBottom: 18, lineHeight: 1.5, color: 'var(--muted)' }}>
        Tem certeza que deseja remover <strong style={{ color: 'var(--text)' }}>{memberToRemove.name}</strong>?
        Os lançamentos atribuídos a esse perfil serão migrados para o perfil escolhido abaixo.
        Contas e cartões seguem as regras do servidor (titularidade). Esta ação não pode ser desfeita.
      </p>

      <div className="form-group">
        <label className="form-label" htmlFor="member-merge-into">Migrar dados para o perfil</label>
        <select
          id="member-merge-into"
          className="form-select"
          value={mergeInto}
          onChange={e => setChoice(e.target.value)}
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
          className="btn btn-danger"
          onClick={() => onConfirm(mergeInto)}
          disabled={!canSubmit}
        >
          {loading ? '⏳ Removendo…' : '🗑️ Remover e migrar'}
        </button>
      </div>
    </Modal>
  );
}
