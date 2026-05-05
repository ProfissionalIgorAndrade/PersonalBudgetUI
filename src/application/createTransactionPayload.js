/**
 * Client-side validation + JSON body for POST /api/transactions (CreateTransactionRequest).
 * (Enums inlined to avoid a circular import with application/mappers.)
 */
const TYPE_TO_API = { income: 'Income', expense: 'Expense' };
const STATUS_TO_API = { paid: 'Completed', pending: 'Pending', cancelled: 'Cancelled' };

const ROUND2 = n => Math.round(Number(n) * 100) / 100;

function num(v, fallback = NaN) {
  if (v == null || v === '') return fallback;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Discriminant used when building payloads.
 * @typedef {'transfer'|'account'|'creditCard'} CreatePaymentArm
 */

/**
 * @returns {CreatePaymentArm}
 */
export function resolveCreatePaymentArm(f) {
  if (!f || f.type === 'transfer') return 'transfer';
  if (f.cardId) return 'creditCard';
  return 'account';
}

/** @typedef {{ kind:'transfer'; id:string } | { kind:'transaction'; id:string } | { kind:'unknown'}} CreateTxOutcome */

/**
 * Normalize successful POST payloads (camelCase / PascalCase / plain id).
 * @returns {CreateTxOutcome}
 */
export function describeCreateTransactionResponse(data) {
  if (data == null || typeof data !== 'object')
    return { kind: 'unknown' };

  const transferId =
    data.transferId
    ?? data.TransferId
    ?? null;
  if (transferId !== null && transferId !== undefined && `${transferId}`.trim() !== '')
    return { kind: 'transfer', id: String(transferId) };

  const tid =
    data.transactionId
    ?? data.TransactionId
    ?? data.id
    ?? data.Id;
  if (tid !== null && tid !== undefined && `${tid}`.trim() !== '')
    return { kind: 'transaction', id: String(tid) };

  return { kind: 'unknown' };
}

/**
 * Validates the transactional form-like object used by TxForm before POST.
 * @returns {string[]} human-readable errors (empty if valid)
 */
export function validateCreateTransactionDraft(f) {
  const errors = [];
  const desc = (f.description ?? '').trim();
  if (!desc) errors.push('Informe o título / descrição.');

  const date = (f.date ?? '').trim();
  if (!date) errors.push('Informe a data.');

  const arm = resolveCreatePaymentArm(f);

  if (f.type === 'transfer') {
    const from = (f.originAccountId ?? '').trim();
    const to = (f.destinationAccountId ?? '').trim();
    if (!from || !to) errors.push('Selecione conta de origem e destino.');
    if (from && to && from === to) errors.push('Origem e destino devem ser contas diferentes.');
    const amt = num(f.amount);
    if (!(amt >= 0) || amt < 0) errors.push('Informe um valor válido (≥ 0).');
    return errors;
  }

  const hasC = !!(f.cardId ?? '').trim();
  const hasA = !!(f.accountId ?? '').trim();
  if (!hasC && !hasA) errors.push('Selecione a conta ou o cartão.');
  if (hasC && hasA) errors.push('Use só conta ou só cartão neste lançamento.');
  if (errors.length) return errors;

  if (arm === 'account') {
    const acc = (f.accountId ?? '').trim();
    if (!acc) errors.push('Selecione a conta do lançamento.');
  } else if (arm === 'creditCard') {
    const cid = (f.cardId ?? '').trim();
    if (!cid) errors.push('Selecione o cartão.');
  }

  if (errors.length) return errors;

  const recurrence = f.recurrence || 'variable';

  // installment requires a credit card
  if (recurrence === 'installment') {
    const cid = (f.cardId ?? '').trim();
    if (!cid) errors.push('Selecione o cartão para lançamento parcelado.');
    const nInst = Math.floor(num(f.installments));
    if (!(nInst >= 2)) errors.push('Parcelamento exige duas ou mais parcelas.');
    const a = num(f.amount);
    if (!(a > 0)) errors.push('Informe o valor da parcela.');
    return errors;
  }

  if (arm === 'creditCard') {
    if (recurrence === 'fixed') {
      errors.push('Recorrência Fixa é exclusiva de conta. Para cartão use Variável ou Parcelada.');
      return errors;
    }
    const a = num(f.amount);
    if (!(a >= 0) || a < 0) errors.push('Informe um valor válido (≥ 0).');
    return errors;
  }

  /* conta */
  const a = num(f.amount);
  if (!(a >= 0) || a < 0) errors.push('Informe um valor válido (≥ 0).');
  if (errors.length) return errors;

  if (recurrence === 'fixed') {
    const reps = Math.floor(num(f.repeatCount));
    if (!(reps >= 2)) errors.push('Recorrência Fixa exige pelo menos 2 meses.');
  }

  return errors;
}

/**
 * Builds the JSON body aligned with backend CreateTransactionRequest.
 * @throws {Error} when validation fails
 */
export function buildCreateTransactionPayload(f) {
  const errs = validateCreateTransactionDraft(f);
  if (errs.length) throw new Error(errs[0]);

  const isTransfer = f.type === 'transfer';
  const arm = resolveCreatePaymentArm(f);
  const recurrence = f.recurrence || 'variable';

  if (isTransfer) {
    return {
      type: 'Expense',
      frequency: 'Variable',
      paymentMethod: 'Transfer',
      amount: ROUND2(num(f.amount)),
      date: f.date,
      description: (f.description ?? '').trim(),
      categoryId: null,
      attributionProfileId: f.memberId || null,
      fromAccountId: f.originAccountId || null,
      toAccountId: f.destinationAccountId || null,
      accountId: null,
      creditCardId: null,
      autoComplete: false,
      status: null,
    };
  }

  const base = {
    type: TYPE_TO_API[f.type] || 'Expense',
    date: f.date,
    description: (f.description ?? '').trim(),
    categoryId: f.categoryId ? f.categoryId : null,
    attributionProfileId: f.memberId || null,
  };

  if (arm === 'creditCard') {
    const body = {
      ...base,
      paymentMethod: 'CreditCard',
      creditCardId: f.cardId,
      accountId: null,
    };

    if (recurrence === 'installment') {
      const n = Math.max(2, Math.floor(num(f.installments)));
      const per = ROUND2(num(f.amount));
      body.frequency = 'Installments';
      body.installmentCount = n;
      body.amount = per;
      body.totalAmount = ROUND2(per * n);
      body.autoComplete = false;
      body.status = null;
      return body;
    }

    body.frequency = 'Variable';
    body.amount = ROUND2(num(f.amount));
    body.autoComplete = false;
    body.status = null;
    return body;
  }

  /* Account */
  const body = {
    ...base,
    paymentMethod: 'Account',
    accountId: f.accountId || null,
    creditCardId: null,
  };

  if (recurrence === 'fixed') {
    const reps = Math.max(2, Math.floor(num(f.repeatCount)));
    body.frequency = 'Fixed';
    body.repeatCount = reps;
    body.amount = ROUND2(num(f.amount));
    const exp = (f.expirationDate ?? '').trim();
    if (exp) body.expirationDate = exp;
    body.autoComplete = false;
    body.status = null;
    return body;
  }

  body.frequency = 'Variable';
  body.amount = ROUND2(num(f.amount));
  const paid = f.status === 'paid';
  body.autoComplete = paid;
  body.status = paid ? null : (STATUS_TO_API[f.status] || 'Pending');

  return body;
}

export function buildCreateTransactionResult(f) {
  try {
    return { ok: true, body: buildCreateTransactionPayload(f) };
  } catch (e) {
    const msg = e?.message || 'Não foi possível montar o lançamento.';
    return { ok: false, errors: [msg] };
  }
}
