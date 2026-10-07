import React, { useState } from 'react';
import Modal from '../../shared/components/Modal';
import { R$ } from '../../../core/utils/format';

export const REASON_MAX = 200;

const errStyle = { color: 'var(--red)', marginTop: 6 };

/**
 * Exclui uma caixinha. O motivo é obrigatório; havendo saldo, ele precisa ir
 * para outra caixinha ativa. Erro do servidor fica no modal, que só fecha
 * quando a exclusão dá certo.
 */
export default function DeleteSavingsBoxForm({ box, others = [], accountNameOf = () => null, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');

  const balance = Number(box?.balance) || 0;
  const hasBalance = balance > 0;
  const noDestination = hasBalance && others.length === 0;

  const reasonText = reason.trim();
  const reasonError = reasonText ? '' : 'Informe o motivo da exclusão.';
  const destinationError = hasBalance && !destinationId ? 'Escolha a caixinha que vai receber o saldo.' : '';

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (saving || noDestination || reasonError || destinationError) return;
    setSaving(true);
    setServerError('');
    try {
      await onConfirm({
        reason: reasonText,
        ...(hasBalance ? { destinationAccountId: destinationId } : {}),
      });
    } catch (err) {
      setServerError(err?.message || 'Não foi possível excluir a caixinha.');
      setSaving(false);
    }
  };

  const showReasonError = submitted && reasonError;
  const showDestinationError = submitted && destinationError;

  return (
    <Modal title="Excluir caixinha" onClose={onClose} confirmOnOverlay>
      <form onSubmit={submit} noValidate>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text)' }}>{box.name}</strong>
          {' · '}saldo atual {R$(balance)}
        </p>

        <div className="form-group">
          <label className="form-label" htmlFor="delete-box-reason">Motivo *</label>
          <textarea
            id="delete-box-reason"
            className="form-input form-textarea"
            rows={3}
            autoFocus
            maxLength={REASON_MAX}
            placeholder="Ex: objetivo concluído"
            aria-invalid={showReasonError ? 'true' : 'false'}
            aria-describedby="delete-box-reason-hint"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
          <p id="delete-box-reason-hint" className="txxs tmuted" style={{ marginTop: 6 }}>
            {reason.length}/{REASON_MAX}
          </p>
          {showReasonError && <p role="alert" className="txxs" style={errStyle}>{reasonError}</p>}
        </div>

        {hasBalance ? (
          <div className="form-group">
            <label className="form-label" htmlFor="delete-box-destination">Destino *</label>
            <select
              id="delete-box-destination"
              className="form-select"
              disabled={noDestination}
              aria-invalid={showDestinationError ? 'true' : 'false'}
              value={destinationId}
              onChange={e => setDestinationId(e.target.value)}
            >
              <option value="">— Selecione —</option>
              {others.map(o => {
                const owner = accountNameOf(o.parentAccountId);
                return <option key={o.id} value={o.id}>{owner ? `${o.name} · ${owner}` : o.name}</option>;
              })}
            </select>
            {noDestination ? (
              <p role="alert" className="txxs" style={errStyle}>
                Crie outra caixinha para receber o saldo ou resgate antes.
              </p>
            ) : (
              <p className="txxs tmuted" style={{ marginTop: 6 }}>
                O saldo de {R$(balance)} será movido para a caixinha escolhida.
              </p>
            )}
            {showDestinationError && !noDestination && (
              <p role="alert" className="txxs" style={errStyle}>{destinationError}</p>
            )}
          </div>
        ) : (
          <p className="txxs tmuted" style={{ marginBottom: 16 }}>Esta caixinha não tem saldo.</p>
        )}

        {serverError && (
          <p role="alert" className="txxs" style={{ ...errStyle, marginBottom: 12 }}>{serverError}</p>
        )}

        <div className="flex jce gap2" style={{ gap: 8, marginTop: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className="btn btn-danger" disabled={saving || noDestination}>
            {saving ? 'Excluindo…' : 'Excluir caixinha'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
