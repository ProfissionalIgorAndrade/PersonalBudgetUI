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

  const amount = Number(f.amount) || 0;
  const inBox = Number(f.box?.balance) || 0;

  // Depósito continua sem teto: a caixinha é independente da conta.
  //
  // Resgate tem teto no que a caixinha tem, porque o domínio passou a recusar
  // saldo negativo. O aviso aqui é conveniência — a regra mora no backend, e
  // avisar antes evita a viagem de ida e volta.
  const tooMuch = !saving && amount > inBox;
  const canSave = amount > 0 && !tooMuch;

  return (
    <Modal title={saving ? 'Guardar dinheiro' : 'Resgatar dinheiro'} onClose={onClose} confirmOnOverlay>
      <form onSubmit={e => { e.preventDefault(); if (canSave) onSave(); }}>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>
          {saving
            ? <>Entra em <strong style={{ color: 'var(--text)' }}>{f.box?.name}</strong>.</>
            : <>Sai de <strong style={{ color: 'var(--text)' }}>{f.box?.name}</strong>.</>}
          {' '}A caixinha é independente da conta, então isso não entra nas
          receitas nem nas despesas.
        </p>

        <div className="form-group">
          <label className="form-label">Valor (R$) *</label>
          <CurrencyInput value={f.amount} onChange={v => set('amount', v)} autoFocus />
          <p className="txxs" style={{ marginTop: 6, color: tooMuch ? 'var(--red)' : 'var(--muted)' }}>
            {tooMuch
              ? `A caixinha tem ${R$(inBox)}. Não dá para resgatar mais do que isso.`
              : `Na caixinha hoje: ${R$(inBox)}`}
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
