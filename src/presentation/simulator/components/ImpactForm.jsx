import React, { useState } from 'react';
import Modal from '../../shared/components/Modal';
import CurrencyInput from '../../shared/components/CurrencyInput';
import DateInput from '../../shared/components/DateInput';

const BLANK = {
  description: '',
  amount: 0,
  type: 'Expense',
  mode: 'Single',          // 'Single' | 'Installment'
  startDate: '',
  installmentCount: 12,
};

export default function ImpactForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({ ...BLANK, ...initial });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    if (form.amount <= 0) return;
    if (!form.startDate) return;
    if (form.mode === 'Installment' && form.installmentCount < 1) return;

    onSave({
      description:      form.description.trim(),
      amount:           form.amount,
      type:             form.type,
      mode:             form.mode,
      startDate:        form.startDate,
      installmentCount: form.mode === 'Installment' ? Number(form.installmentCount) : 1,
    });
    onClose();
  };

  const modeLabel = { Single: 'Única', Installment: 'Parcelada' };

  return (
    <Modal
      title={initial ? 'Editar impacto' : 'Adicionar impacto'}
      onClose={onClose}
      confirmOnOverlay
    >
      <form onSubmit={handleSubmit}>
        {/* ── Tipo: Despesa / Receita ── */}
        <div className="form-group">
          <label className="form-label">Tipo</label>
          <div className="sim-type-toggle" role="group">
            {['Expense', 'Income'].map(t => (
              <button
                key={t}
                type="button"
                className={`sim-type-btn${form.type === t ? ' active' : ''} ${t === 'Expense' ? 'expense' : 'income'}`}
                onClick={() => set('type', t)}
                aria-pressed={form.type === t}
              >
                {t === 'Expense' ? '📤 Despesa' : '📥 Receita'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Modo: Única / Parcelada / Mensal ── */}
        <div className="form-group">
          <label className="form-label">Modalidade</label>
          <div className="sim-mode-toggle" role="group">
            {['Single', 'Installment'].map(m => (
              <button
                key={m}
                type="button"
                className={`sim-mode-btn${form.mode === m ? ' active' : ''}`}
                onClick={() => set('mode', m)}
                aria-pressed={form.mode === m}
              >
                {modeLabel[m]}
              </button>
            ))}
          </div>
          <p className="txxs tmuted" style={{ marginTop: 5, lineHeight: 1.4 }}>
            {form.mode === 'Single'      && 'Ocorre uma única vez no mês escolhido.'}
            {form.mode === 'Installment' && 'Divide em parcelas mensais (ex: compra no cartão).'}
          </p>
        </div>

        {/* ── Descrição ── */}
        <div className="form-group">
          <label className="form-label" htmlFor="impact-desc">Descrição</label>
          <input
            id="impact-desc"
            className="form-input"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder={
              form.mode === 'Installment' ? 'Ex: Carro, Celular parcelado...' :
              'Ex: Conserto, Viagem, Presente...'
            }
            required
          />
        </div>

        {/* ── Valor ── */}
        <div className="form-group">
          <label className="form-label" htmlFor="impact-amount">
            {form.mode === 'Installment' ? 'Valor da parcela (R$)' : 'Valor (R$)'}
          </label>
          <CurrencyInput
            value={form.amount}
            onChange={v => set('amount', v)}
            required
          />
        </div>

        {/* ── Parcelamento ── */}
        {form.mode === 'Installment' && (
          <div className="form-group">
            <label className="form-label" htmlFor="impact-installments">Número de parcelas</label>
            <input
              id="impact-installments"
              type="number"
              min="1"
              max="360"
              className="form-input"
              value={form.installmentCount}
              onChange={e => set('installmentCount', e.target.value)}
              required
            />
            {form.amount > 0 && form.installmentCount >= 1 && (
              <p className="txxs tmuted" style={{ marginTop: 5 }}>
                Total: R$ {(form.amount * Number(form.installmentCount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>
        )}

        {/* ── Mês de início ── */}
        <div className="form-group">
          <label className="form-label">
            {form.mode === 'Single' ? 'Mês do impacto' : 'Mês de início'}
          </label>
          <DateInput
            value={form.startDate}
            onChange={v => set('startDate', v)}
            required
          />
        </div>

        <div className="flex jce" style={{ gap: 8, marginTop: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary">Salvar</button>
        </div>
      </form>
    </Modal>
  );
}
