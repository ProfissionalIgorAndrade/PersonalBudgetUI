import React, { useState, useEffect, useRef } from 'react';
import Modal from '../../shared/components/Modal';
import CurrencyInput from '../../shared/components/CurrencyInput';
import { MODE_LABEL, TYPE_LABEL, TYPE_ICON, previewText } from '../logic/labels';
import { MAX_DESCRIPTION, MAX_INSTALLMENTS, MAX_MONTHLY_DURATION } from '../../../core/utils/simulatorStorage';

const MODE_HINT = {
  Single: 'Acontece uma única vez, no mês escolhido.',
  Installment: 'Divide em parcelas mensais consecutivas (ex.: compra no cartão).',
  Monthly: 'Repete todo mês a partir do início, por uma duração ou até o fim do horizonte.',
};

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Estado inicial do formulário a partir de uma simulação salva (edição) ou em branco. */
function toFormState(initial, defaultMonth) {
  if (!initial) {
    return {
      description: '', type: 'Expense', mode: 'Single', startMonth: defaultMonth,
      amount: 0, amountKind: 'PerInstallment', installments: '12', months: '',
    };
  }
  return {
    description: initial.description,
    type: initial.type,
    mode: initial.mode,
    startMonth: initial.startMonth,
    amount: initial.amount,
    amountKind: initial.amountKind || 'PerInstallment',
    installments: initial.installments ? String(initial.installments) : '12',
    months: initial.months ? String(initial.months) : '',
  };
}

/** Regras do formulário (as mesmas que o backend aplica). Devolve { campo: mensagem }. */
export function validateSimulationForm(f) {
  const errors = {};
  const description = f.description.trim();
  if (!description) errors.description = 'Informe uma descrição.';
  else if (description.length > MAX_DESCRIPTION) errors.description = `Use no máximo ${MAX_DESCRIPTION} caracteres.`;

  if (!(Number(f.amount) > 0)) errors.amount = 'Informe um valor maior que zero.';

  const m = MONTH_RE.exec(f.startMonth || '');
  if (!m) errors.startMonth = 'Escolha o mês de início.';
  else if (Number(m[1]) < 2000 || Number(m[1]) > 2100) errors.startMonth = 'Use um ano entre 2000 e 2100.';

  if (f.mode === 'Installment') {
    const n = Number(f.installments);
    if (f.installments === '' || !Number.isInteger(n) || n < 1 || n > MAX_INSTALLMENTS) {
      errors.installments = `Informe de 1 a ${MAX_INSTALLMENTS} parcelas.`;
    }
  }
  if (f.mode === 'Monthly' && f.months !== '') {
    const n = Number(f.months);
    if (!Number.isInteger(n) || n < 0 || n > MAX_MONTHLY_DURATION) {
      errors.months = `Use de 1 a ${MAX_MONTHLY_DURATION} meses, ou deixe vazio para ir até o fim do horizonte.`;
    }
  }
  return errors;
}

function Field({ id, label, error, hint, children }) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="wi-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="wi-field-error" id={`${id}-error`} role="alert">{error}</p>}
    </div>
  );
}

/** Formulário de simulação (adicionar/editar) em modal. */
export default function SimulationForm({ initial, defaultMonth, onSave, onClose }) {
  const [form, setForm] = useState(() => toFormState(initial, defaultMonth));
  const [errors, setErrors] = useState({});
  const [attempted, setAttempted] = useState(0);
  const formRef = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Depois de um envio inválido, o foco vai para o primeiro campo com erro.
  useEffect(() => {
    if (!attempted || !formRef.current) return;
    const bad = formRef.current.querySelector('[aria-invalid="true"]');
    if (bad) bad.focus();
  }, [attempted]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validateSimulationForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setAttempted((n) => n + 1);
      return;
    }
    onSave({
      description: form.description.trim(),
      type: form.type,
      mode: form.mode,
      startMonth: form.startMonth,
      amount: Number(form.amount),
      amountKind: form.amountKind,
      installments: form.mode === 'Installment' ? Number(form.installments) : null,
      months: form.mode === 'Monthly' && form.months !== '' ? Number(form.months) : null,
    });
    onClose();
  };

  const invalid = (k) => (errors[k] ? { 'aria-invalid': 'true', 'aria-describedby': `wi-f-${k}-error` } : {});
  const amountLabel = form.mode === 'Installment'
    ? (form.amountKind === 'Total' ? 'Valor total (R$)' : 'Valor da parcela (R$)')
    : form.mode === 'Monthly' ? 'Valor por mês (R$)' : 'Valor (R$)';
  const preview = previewText(form);

  return (
    <Modal title={initial ? 'Editar simulação' : 'Nova simulação'} onClose={onClose} confirmOnOverlay>
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="wi-form">
        <div className="form-group">
          <span className="form-label" id="wi-f-type-label">Tipo</span>
          <div className="seg" role="group" aria-labelledby="wi-f-type-label">
            {['Expense', 'Income'].map((t) => (
              <button key={t} type="button" aria-pressed={form.type === t} onClick={() => set('type', t)}>
                <span aria-hidden="true">{TYPE_ICON[t]} </span>{TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <span className="form-label" id="wi-f-mode-label">Modalidade</span>
          <div className="seg" role="group" aria-labelledby="wi-f-mode-label">
            {Object.keys(MODE_LABEL).map((m) => (
              <button key={m} type="button" aria-pressed={form.mode === m} onClick={() => set('mode', m)}>
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
          <p className="wi-hint">{MODE_HINT[form.mode]}</p>
        </div>

        <Field id="wi-f-description" label="Descrição" error={errors.description}>
          <input
            id="wi-f-description" className="form-input" value={form.description}
            maxLength={MAX_DESCRIPTION} autoComplete="off"
            placeholder={form.mode === 'Installment' ? 'Ex.: Carro, celular parcelado...' : 'Ex.: Viagem, conserto, aumento...'}
            onChange={(e) => set('description', e.target.value)} {...invalid('description')}
          />
        </Field>

        {form.mode === 'Installment' && (
          <div className="form-group">
            <span className="form-label" id="wi-f-kind-label">O valor informado é</span>
            <div className="seg" role="group" aria-labelledby="wi-f-kind-label">
              <button type="button" aria-pressed={form.amountKind === 'PerInstallment'} onClick={() => set('amountKind', 'PerInstallment')}>
                Valor da parcela
              </button>
              <button type="button" aria-pressed={form.amountKind === 'Total'} onClick={() => set('amountKind', 'Total')}>
                Valor total
              </button>
            </div>
          </div>
        )}

        <Field id="wi-f-amount" label={amountLabel} error={errors.amount}>
          <CurrencyInput id="wi-f-amount" value={form.amount} onChange={(v) => set('amount', v)} aria-required="true" {...invalid('amount')} />
        </Field>

        {form.mode === 'Installment' && (
          <Field id="wi-f-installments" label="Número de parcelas" error={errors.installments}>
            <input
              id="wi-f-installments" type="number" inputMode="numeric" min="1" max={MAX_INSTALLMENTS} step="1"
              className="form-input" value={form.installments} aria-required="true"
              onChange={(e) => set('installments', e.target.value)} {...invalid('installments')}
            />
          </Field>
        )}

        <Field id="wi-f-startMonth" label={form.mode === 'Single' ? 'Mês do impacto' : 'Mês de início'} error={errors.startMonth}>
          <input
            id="wi-f-startMonth" type="month" className="form-input" value={form.startMonth}
            placeholder="aaaa-mm" aria-required="true"
            onChange={(e) => set('startMonth', e.target.value)} {...invalid('startMonth')}
          />
        </Field>

        {form.mode === 'Monthly' && (
          <Field
            id="wi-f-months" label="Duração em meses (opcional)" error={errors.months}
            hint="Vazio = até o fim do horizonte escolhido."
          >
            <input
              id="wi-f-months" type="number" inputMode="numeric" min="0" max={MAX_MONTHLY_DURATION} step="1"
              className="form-input" value={form.months} placeholder="Até o fim do horizonte"
              onChange={(e) => set('months', e.target.value)} {...invalid('months')}
            />
          </Field>
        )}

        <p className="wi-preview" aria-live="polite" data-testid="wi-preview">
          {preview ? <><span aria-hidden="true">🧮 </span>{preview}</> : ''}
        </p>

        <div className="wi-form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary">Salvar</button>
        </div>
      </form>
    </Modal>
  );
}
