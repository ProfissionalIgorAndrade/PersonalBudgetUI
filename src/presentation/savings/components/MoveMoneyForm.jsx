import React from 'react';
import Modal from '../../shared/components/Modal';
import CurrencyInput from '../../shared/components/CurrencyInput';
import { R$ } from '../../../core/utils/format';

/**
 * Guardar ou resgatar. As duas direções são a mesma transferência com origem
 * e destino trocados, então um formulário só cobre as duas.
 */
export default function MoveMoneyForm({ f, onChange, onSave, onClose }) {
  const set = (k, v) => onChange({ ...f, [k]: v });
  const saving = f.direction === 'in';

  const available = Number(saving ? f.account?.balance : f.box?.balance) || 0;
  const amount = Number(f.amount) || 0;

  // O backend recusa saldo negativo; avisar aqui evita a viagem de ida e volta.
  const tooMuch = amount > available;
  const canSave = amount > 0 && !tooMuch;

  return (
    <Modal title={saving ? 'Guardar dinheiro' : 'Resgatar dinheiro'} onClose={onClose} confirmOnOverlay>
      <form onSubmit={e => { e.preventDefault(); if (canSave) onSave(); }}>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>
          {saving
            ? <>Da conta para <strong style={{ color: 'var(--text)' }}>{f.box?.name}</strong>.</>
            : <>De <strong style={{ color: 'var(--text)' }}>{f.box?.name}</strong> de volta para a conta.</>}
          {' '}Isso é uma transferência, então não entra nas despesas.
        </p>

        <div className="form-group">
          <label className="form-label">Valor (R$) *</label>
          <CurrencyInput value={f.amount} onChange={v => set('amount', v)} autoFocus />
          <p className="txxs" style={{ marginTop: 6, color: tooMuch ? 'var(--red)' : 'var(--muted)' }}>
            {tooMuch
              ? `Disponível: ${R$(available)}. O valor não pode passar disso.`
              : `Disponível: ${R$(available)}`}
          </p>
        </div>

        <div className="flex jce gap2" style={{ gap: 8, marginTop: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={!canSave}>
            {saving ? '↓ Guardar' : '↑ Resgatar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
