/** Extrai um número de valores monetários da API (número, string ou objeto tipo Money { amount / Amount }). */
export function parseMoneyAmount(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const t = value.trim();
    if (t === '') return 0;
    const n = Number(t);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof value === 'object') {
    const inner = value.amount ?? value.Amount ?? value.value ?? value.Value;
    return parseMoneyAmount(inner);
  }
  return 0;
}
