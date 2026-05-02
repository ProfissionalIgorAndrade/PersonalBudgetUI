/* ─── Enum conversions ──────────────────────────────────────── */
export const TYPE_TO_API    = { income: 'Income', expense: 'Expense' };
export const TYPE_FROM_API  = { Income: 'income', Expense: 'expense' };

export const FREQ_TO_API    = { fixed: 'Fixed', variable: 'Variable', installment: 'Installments' };
export const FREQ_FROM_API  = { Fixed: 'fixed', Variable: 'variable', Installments: 'installment' };

export const STATUS_TO_API   = { paid: 'Completed', pending: 'Pending', cancelled: 'Cancelled' };
export const STATUS_FROM_API = { Completed: 'paid', Pending: 'pending', Cancelled: 'cancelled', Simulated: 'pending' };

export const CAT_TYPE_TO_API   = { income: 'Income', expense: 'Expense' };
export const CAT_TYPE_FROM_API = { Income: 'income', Expense: 'expense' };

/* ─── Bank metadata ─────────────────────────────────────────── */
export const BANK_LABELS = {
  Itau: 'Itaú', Nubank: 'Nubank', Inter: 'Inter',
  Santander: 'Santander', Bradesco: 'Bradesco', Caixa: 'Caixa',
};

export const BANK_COLORS = {
  Itau: '#f47321', Nubank: '#8a05be', Inter: '#ff7a00',
  Santander: '#cc0000', Bradesco: '#cc092f', Caixa: '#006f3d',
};

/* ─── Visual side-table helpers (localStorage) ──────────────── */
function loadVisuals(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
}
function saveVisual(key, id, data) {
  const v = loadVisuals(key);
  localStorage.setItem(key, JSON.stringify({ ...v, [id]: data }));
}
function removeVisual(key, id) {
  const v = loadVisuals(key);
  delete v[id];
  localStorage.setItem(key, JSON.stringify(v));
}

export const catVisuals    = { load: () => loadVisuals('pb_cat_visuals'),    save: (id, d) => saveVisual('pb_cat_visuals', id, d),    remove: (id) => removeVisual('pb_cat_visuals', id) };
export const memberVisuals = { load: () => loadVisuals('pb_member_visuals'), save: (id, d) => saveVisual('pb_member_visuals', id, d), remove: (id) => removeVisual('pb_member_visuals', id) };

/* ─── Normalizers ───────────────────────────────────────────── */
export function normalizeAccount(a) {
  return {
    id:       a.id,
    name:     `${BANK_LABELS[a.bank] || a.bank}${a.number ? ` ···${String(a.number).slice(-4)}` : ''}`,
    bank:     a.bank,
    agency:   a.agency || '',
    number:   a.number || '',
    balance:  a.balance ?? 0,
    color:    BANK_COLORS[a.bank] || '#2dd4bf',
    type:     'checking',
    isActive: a.isActive !== false,
  };
}

export function normalizeCategory(c) {
  const v = catVisuals.load()[c.id] || {};
  return {
    id:    c.id,
    name:  c.name,
    type:  CAT_TYPE_FROM_API[c.type] || 'expense',
    icon:  v.icon  || '📦',
    color: v.color || '#2dd4bf',
  };
}

export function normalizeProfile(p) {
  if (!p || typeof p !== 'object') return null;
  const id =
    p.id
    ?? p.profileId
    ?? p.ProfileId
    ?? p.memberId
    ?? p.MemberId
    ?? p.userId
    ?? p.UserId;
  if (id == null || id === '') return null;

  const idKey = String(id);
  const v = memberVisuals.load()[idKey] || memberVisuals.load()[id] || {};
  const uid = p.userId ?? p.UserId ?? null;

  return {
    id,
    name:   (p.displayName ?? p.name ?? p.Name ?? '').trim() || 'Membro',
    emoji:  v.emoji || '👤',
    color:  v.color || '#2dd4bf',
    type:   p.kind ?? p.Kind ?? 'other',
    userId: uid,
  };
}

export function normalizeCard(c) {
  return {
    id:         c.id,
    name:       c.name,
    limit:      c.limit ?? 0,
    closingDay: c.closingDay,
    dueDay:     c.dueDay,
    accountId:  c.accountId || '',
    color:      '#818cf8',
    flag:       'visa',
    lastDigits: '',
  };
}

export function normalizeTransaction(t) {
  const isTransfer = t.paymentMethod === 'Transfer';
  const dateStr    = t.date
    ? (typeof t.date === 'string' ? t.date.slice(0, 10) : new Date(t.date).toISOString().slice(0, 10))
    : '';
  return {
    id:            t.id,
    description:   t.description,
    amount:        t.amount,
    date:          dateStr,
    type:          isTransfer ? 'transfer' : (TYPE_FROM_API[t.type] || 'expense'),
    status:        STATUS_FROM_API[t.status] || 'pending',
    recurrence:    FREQ_FROM_API[t.frequency] || 'variable',
    categoryId:    t.categoryId   || '',
    memberId:      t.attributionProfileId || '',
    accountId:     t.accountId    || '',
    cardId:        t.creditCardId || '',
    transferId:    t.transferId   || null,
    paymentMethod: t.paymentMethod,
    notes:         '',
  };
}

/* ─── Form → API body ───────────────────────────────────────── */
export function txToApi(f) {
  const isTransfer    = f.type === 'transfer';
  const hasCard       = !!f.cardId && !isTransfer;
  const paymentMethod = isTransfer ? 'Transfer' : hasCard ? 'CreditCard' : f.accountId ? 'Account' : 'Cash';

  const body = {
    type:                 isTransfer ? 'Expense' : (TYPE_TO_API[f.type] || 'Expense'),
    frequency:            FREQ_TO_API[f.recurrence] || 'Variable',
    paymentMethod,
    amount:               Number(f.amount),
    date:                 f.date,
    description:          f.description,
    categoryId:           (!isTransfer && f.categoryId) ? f.categoryId : null,
    attributionProfileId: f.memberId || null,
    autoComplete:         f.status === 'paid',
    status:               f.status === 'paid' ? null : (STATUS_TO_API[f.status] || null),
  };

  if (isTransfer) {
    body.fromAccountId = f.originAccountId      || null;
    body.toAccountId   = f.destinationAccountId || null;
  } else if (hasCard) {
    body.creditCardId = f.cardId;
    body.accountId    = null;
  } else {
    body.accountId    = f.accountId || null;
    body.creditCardId = null;
  }

  if (f.recurrence === 'installment' && f.installments) {
    body.installmentCount = Number(f.installments);
    body.totalAmount      = Number(f.amount) * Number(f.installments);
    body.title            = f.description;
  }

  return body;
}
