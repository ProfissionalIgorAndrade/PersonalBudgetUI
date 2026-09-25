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

  // Sem teto. A caixinha é independente da conta: depositar e sacar são
  // operações diretas nela, e o backend não valida saldo em nenhuma das duas.
  //
  // A versão anterior travava pelo saldo da conta de origem, herdado de
  // quando guardar era uma transferência. Com o saldo da conta em zero, isso
  // barrava qualquer depósito.
  const canSave = amount > 0;

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
          <p className="txxs tmuted" style={{ marginTop: 6 }}>
            {saving
              ? <>Na caixinha hoje: {R$(inBox)}</>
              : <>Na caixinha hoje: {R$(inBox)}{amount > inBox && amount > 0
                  ? ` · sacar ${R$(amount)} deixa a caixinha negativa` : ''}</>}
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
