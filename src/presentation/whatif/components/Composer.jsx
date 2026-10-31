import React, { useEffect, useRef, useState } from 'react';
import CurrencyInput from '../../shared/components/CurrencyInput';
import { R$ } from '../../../core/utils/format';
import { validateSimulationForm } from '../../simulator/components/SimulationForm';
import { previewText, signedMoney } from '../../simulator/logic/labels';
import { MAX_DESCRIPTION, MAX_INSTALLMENTS, MAX_MONTHLY_DURATION, MAX_SIMULATIONS } from '../../../core/utils/simulatorStorage';
import { INTENTS, intentById, intentOf, modeFor } from '../logic/intents';

const INTENT_HINT = {
  'buy': 'Sai tudo em um mês',
  'buy-installments': 'Parcelas mensais seguidas',
  'sell': 'Entra de uma vez ou em parcelas',
  'new-expense': 'Assinatura, escola, aluguel',
  'new-income': 'Aumento, freela, aluguel recebido',
};

const money = (v) => (v < 0 ? `−${R$(-v)}` : R$(v));

function initialForm(editing, defaultMonth, initialIntent) {
  if (!editing) {
    return {
      intent: initialIntent ?? null, description: '', amount: 0, startMonth: defaultMonth,
      amountKind: 'Total', installments: '10', months: '', splitSale: false,
    };
  }
  return {
    intent: intentOf(editing),
    description: editing.description ?? '',
    amount: editing.amount,
    startMonth: editing.startMonth,
    amountKind: editing.amountKind || 'PerInstallment',
    installments: editing.installments ? String(editing.installments) : '10',
    months: editing.months ? String(editing.months) : '',
    splitSale: editing.type === 'Income' && editing.mode === 'Installment',
  };
}

/** Campos do formulário no formato que useSimulator espera. */
function toValues(form) {
  const intent = intentById(form.intent);
  const mode = modeFor(form.intent, form.splitSale);
  return {
    description: form.description,
    type: intent.type,
    mode,
    startMonth: form.startMonth,
    amount: Number(form.amount) || 0,
    amountKind: form.amountKind,
    installments: mode === 'Installment' ? form.installments : '',
    months: mode === 'Monthly' ? form.months : '',
  };
}

/**
 * Simulação provisória a partir do formulário, para o quadro mostrar o efeito
 * antes de salvar. Devolve null enquanto valor, mês ou prazo estiverem
 * inválidos; a descrição pode faltar (o quadro chama de "Nova simulação").
 */
export function draftToSim(values) {
  if (!values) return null;
  const errors = validateSimulationForm(values);
  delete errors.description;
  if (Object.keys(errors).length > 0) return null;
  return {
    description: values.description.trim(),
    type: values.type,
    mode: values.mode,
    startMonth: values.startMonth,
    amount: values.amount,
    amountKind: values.mode === 'Installment' ? values.amountKind : 'PerInstallment',
    installments: values.mode === 'Installment' ? Number(values.installments) : null,
    months: values.mode === 'Monthly' && values.months !== '' ? Number(values.months) : null,
  };
}

/** Lista de intenções: no cartão da página e no topo do painel lateral. */
export function IntentList({ onPick, limitReached }) {
  if (limitReached) {
    return (
      <p className="wf-notice-inline">
        Você chegou ao limite de {MAX_SIMULATIONS} simulações. Remova alguma para criar outra.
      </p>
    );
  }
  return (
    <ul className="wf-intents">
      {INTENTS.map((it) => (
        <li key={it.id}>
          <button type="button" className={`wf-intent ${it.type === 'Income' ? 'is-income' : 'is-expense'}`} onClick={() => onPick(it.id)}>
            <span className="wf-intent-label">{it.label}</span>
            <span className="wf-intent-hint">{INTENT_HINT[it.id]}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Painel lateral "Simular algo": primeiro a intenção (comprar, parcelar, vender,
 * gasto ou renda mensal), depois só os campos que ela pede. Fica ao lado do
 * quadro, sem cobri-lo: cada mudança entra no quadro como rascunho, e o painel
 * mostra o antes e o depois do período. Esc fecha.
 */
export default function Composer({
  editing, initialIntent, defaultMonth, before, after, months, limitReached, saving, error,
  onChange, onSave, onCancel, onRemove,
}) {
  const [form, setForm] = useState(() => initialForm(editing, defaultMonth, initialIntent));
  const [errors, setErrors] = useState({});
  const [confirmRemove, setConfirmRemove] = useState(false);
  const formRef = useRef(null);
  const firstFieldRef = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // onChange muda a cada render do pai; só o formulário dispara o rascunho.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    onChangeRef.current(form.intent ? toValues(form) : null);
  }, [form]);

  // Abrir o painel leva o foco para dentro dele: o primeiro campo, ou a primeira intenção.
  const sheetRef = useRef(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const openedWithIntent = useRef(Boolean(form.intent));
  useEffect(() => {
    const el = openedWithIntent.current ? firstFieldRef.current : sheetRef.current?.querySelector('.wf-intent');
    el?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onCancelRef.current(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const chooseIntent = (id) => {
    setForm((f) => ({ ...f, intent: id, splitSale: id === 'sell' ? f.splitSale : false }));
    setErrors({});
    requestAnimationFrame(() => firstFieldRef.current?.focus());
  };

  const submit = async (e) => {
    e.preventDefault();
    const values = toValues(form);
    const found = validateSimulationForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    await onSave({
      ...values,
      description: values.description.trim(),
      installments: values.mode === 'Installment' ? Number(values.installments) : null,
      months: values.mode === 'Monthly' && values.months !== '' ? Number(values.months) : null,
    });
  };

  const closeBtn = (
    <button type="button" className="wf-icon-btn" onClick={onCancel} aria-label="Fechar painel">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
  );

  if (!form.intent) {
    return (
      <aside ref={sheetRef} className="wf-sheet" role="dialog" aria-modal="false" aria-labelledby="wf-composer-title">
        <header className="wf-composer-head">
          <h2 className="wf-h2" id="wf-composer-title">Simular algo</h2>
          {closeBtn}
        </header>
        <p className="wf-sub wf-sheet-sub">O que você quer testar? Nenhum lançamento real é alterado.</p>
        <IntentList onPick={chooseIntent} limitReached={limitReached} />
      </aside>
    );
  }

  const intent = intentById(form.intent);
  const values = toValues(form);
  const mode = values.mode;
  const preview = previewText(values);
  const draftReady = Boolean(draftToSim(values));
  const invalid = (k) => (errors[k] ? { 'aria-invalid': 'true', 'aria-describedby': `wf-f-${k}-error` } : {});
  const amountLabel = mode === 'Installment'
    ? (form.amountKind === 'Total' ? 'Valor total' : 'Valor de cada parcela')
    : intent.amountLabel;

  return (
    <aside ref={sheetRef} className="wf-sheet" role="dialog" aria-modal="false" aria-labelledby="wf-composer-title">
      <header className="wf-composer-head">
        <h2 className="wf-h2" id="wf-composer-title">{editing ? 'Editar simulação' : intent.label}</h2>
        <div className="wf-composer-tools">
          {!editing && (
            <button type="button" className="wf-link" onClick={() => set('intent', null)}>Trocar</button>
          )}
          {closeBtn}
        </div>
      </header>
      <p className="wf-sub wf-sheet-sub">O efeito aparece abaixo e no quadro mês a mês enquanto você preenche, antes de salvar.</p>

      {editing && (
        <div className="wf-range wf-range-wrap" role="group" aria-label="Tipo de simulação">
          {INTENTS.map((it) => (
            <button key={it.id} type="button" aria-pressed={form.intent === it.id} onClick={() => chooseIntent(it.id)}>
              {it.label}
            </button>
          ))}
        </div>
      )}

      <form ref={formRef} className="wf-form" onSubmit={submit} noValidate>
        <Field id="description" label="Descrição" error={errors.description}>
          <input
            ref={firstFieldRef} id="wf-f-description" className="wf-input" value={form.description}
            maxLength={MAX_DESCRIPTION} autoComplete="off" placeholder={intent.placeholder}
            onChange={(e) => set('description', e.target.value)} {...invalid('description')}
          />
        </Field>

        {form.intent === 'sell' && (
          <label className="wf-check">
            <input type="checkbox" checked={form.splitSale} onChange={(e) => set('splitSale', e.target.checked)} />
            Recebo em parcelas
          </label>
        )}

        {mode === 'Installment' && (
          <div className="wf-range" role="group" aria-label="O valor informado é">
            <button type="button" aria-pressed={form.amountKind === 'Total'} onClick={() => set('amountKind', 'Total')}>Sei o total</button>
            <button type="button" aria-pressed={form.amountKind === 'PerInstallment'} onClick={() => set('amountKind', 'PerInstallment')}>Sei a parcela</button>
          </div>
        )}

        <div className="wf-form-row">
          <Field id="amount" label={amountLabel} error={errors.amount}>
            <CurrencyInput
              id="wf-f-amount" className="wf-input wf-num" value={form.amount}
              onChange={(v) => set('amount', v)} aria-required="true" {...invalid('amount')}
            />
          </Field>
          {mode === 'Installment' && (
            <Field id="installments" label="Parcelas" error={errors.installments} narrow>
              <input
                id="wf-f-installments" type="number" inputMode="numeric" min="1" max={MAX_INSTALLMENTS} step="1"
                className="wf-input wf-num" value={form.installments}
                onChange={(e) => set('installments', e.target.value)} {...invalid('installments')}
              />
            </Field>
          )}
        </div>

        <div className="wf-form-row">
          <Field id="startMonth" label={intent.monthLabel} error={errors.startMonth}>
            <input
              id="wf-f-startMonth" type="month" className="wf-input" value={form.startMonth}
              onChange={(e) => set('startMonth', e.target.value)} {...invalid('startMonth')}
            />
          </Field>
          {mode === 'Monthly' && (
            <Field id="months" label="Por quantos meses" error={errors.months} hint="Vazio: até o fim do período">
              <input
                id="wf-f-months" type="number" inputMode="numeric" min="0" max={MAX_MONTHLY_DURATION} step="1"
                className="wf-input wf-num" value={form.months} placeholder="Sem prazo"
                aria-describedby="wf-f-months-hint"
                onChange={(e) => set('months', e.target.value)} {...invalid('months')}
              />
            </Field>
          )}
        </div>

        {preview && <p className="wf-preview wf-num" aria-live="polite">{preview}</p>}

        <Impact ready={draftReady} before={before} after={after} months={months} />

        {error && <p className="wf-field-error" role="alert">{error}</p>}

        <div className="wf-form-actions">
          {editing && !confirmRemove && (
            <button type="button" className="wf-link wf-link-danger" onClick={() => setConfirmRemove(true)} disabled={saving}>
              Remover
            </button>
          )}
          {editing && confirmRemove && (
            <span className="wf-confirm">
              Remover de vez?
              <button type="button" className="wf-link wf-link-danger" onClick={onRemove} disabled={saving}>Sim, remover</button>
              <button type="button" className="wf-link" onClick={() => setConfirmRemove(false)}>Não</button>
            </span>
          )}
          <span className="wf-form-spacer" />
          <button type="button" className="wf-btn" onClick={onCancel} disabled={saving}>
            {editing ? 'Cancelar' : 'Descartar'}
          </button>
          <button type="submit" className="wf-btn wf-btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Salvar simulação'}
          </button>
        </div>
      </form>
    </aside>
  );
}

function Field({ id, label, error, hint, narrow, children }) {
  return (
    <div className={`wf-field${narrow ? ' is-narrow' : ''}`}>
      <label className="wf-label" htmlFor={`wf-f-${id}`}>{label}</label>
      {children}
      {hint && !error && <p className="wf-hint" id={`wf-f-${id}-hint`}>{hint}</p>}
      {error && <p className="wf-field-error" id={`wf-f-${id}-error`}>{error}</p>}
    </div>
  );
}

/** Antes e depois do período com o rascunho. */
function Impact({ ready, before, after, months }) {
  if (!ready) {
    return <p className="wf-impact-wait">Preencha o valor e o mês para ver o efeito nos próximos {months === 1 ? 'mês' : `${months} meses`}.</p>;
  }
  if (after.countedCount === 0) {
    return <p className="wf-impact-wait">Ainda não há meses com lançamentos no período para comparar.</p>;
  }
  const diff = after.totals.result - before.totals.result;
  const worstBefore = before.tightest;
  const worstAfter = after.tightest;
  return (
    <dl className="wf-impact" aria-live="polite">
      <div>
        <dt>Sobra do período</dt>
        <dd className="wf-num">
          <span className="wf-was">{money(before.totals.result)}</span>
          <span className={after.totals.result < 0 ? 'is-neg' : undefined}>{money(after.totals.result)}</span>
          <span className="wf-delta">{signedMoney(Math.round(diff * 100) / 100)}</span>
        </dd>
      </div>
      <div>
        <dt>Pior mês</dt>
        <dd className="wf-num">
          <span className="wf-was">{worstBefore.label} {money(worstBefore.result)}</span>
          <span className={worstAfter.result < 0 ? 'is-neg' : undefined}>{worstAfter.label} {money(worstAfter.result)}</span>
        </dd>
      </div>
      <div>
        <dt>Meses no vermelho</dt>
        <dd className="wf-num">
          <span className="wf-was">{before.negativeCount}</span>
          <span className={after.negativeCount > before.negativeCount ? 'is-neg' : undefined}>
            {after.negativeCount} de {after.countedCount}
          </span>
        </dd>
      </div>
    </dl>
  );
}
