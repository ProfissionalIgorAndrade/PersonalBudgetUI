/**
 * Deriva do extrato tudo que a tela do cofrinho mostra além do saldo atual.
 *
 * Cada depósito e resgate é um lançamento com paymentMethod Savings, ligado à
 * caixinha pelo accountId. A partir dessa série sai a evolução, o crescimento
 * do período e as últimas movimentações — nenhum desses números é armazenado,
 * todos são calculados, então não têm como divergir do extrato.
 */

/** Movimentos de caixinha, mais recentes primeiro. */
export function savingsMovements(transactions = [], boxIds = null) {
  const ids = boxIds ? new Set(boxIds) : null;
  return transactions
    .filter(t => t?.type === 'savings' && (!ids || ids.has(t.accountId)))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

/** Soma com sinal: depósito entra, resgate sai. */
export const netOf = (movements = []) =>
  movements.reduce((s, m) => s + (m.savingsDirection === 'out' ? -1 : 1) * Number(m.amount || 0), 0);

/**
 * Saldo acumulado ao fim de cada um dos últimos `months` meses.
 *
 * Caminha do saldo atual para trás, desfazendo cada movimento, em vez de somar
 * do zero: o saldo de hoje é o número confiável, e caixinhas criadas antes de
 * o histórico existir não têm movimento nenhum para somar.
 */
export function savingsSeries(transactions, boxes, months = 12, today = new Date()) {
  const ids = boxes.map(b => b.id);
  const movements = savingsMovements(transactions, ids);
  const current = boxes.reduce((s, b) => s + Number(b.balance || 0), 0);

  const keys = Array.from({ length: months }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (months - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const out = [];
  let running = current;
  for (let i = keys.length - 1; i >= 0; i--) {
    out.unshift({ key: keys[i], total: Math.max(running, 0) });
    // Desfaz o que aconteceu neste mês para chegar ao fechamento do anterior.
    running -= netOf(movements.filter(m => String(m.date).slice(0, 7) === keys[i]));
  }
  return out;
}

/** Quanto o guardado cresceu nos últimos `months` meses, em valor e em %. */
export function savingsGrowth(transactions, boxes, months = 3, today = new Date()) {
  const series = savingsSeries(transactions, boxes, months + 1, today);
  const first = series[0]?.total ?? 0;
  const last = series[series.length - 1]?.total ?? 0;
  return {
    amount: last - first,
    // Sem base não há percentual: "+100%" partindo de zero não informa nada.
    percent: first > 0 ? ((last - first) / first) * 100 : null,
  };
}

/** Progresso em relação à meta. Null quando a caixinha não tem meta. */
export function goalProgress(box) {
  const goal = Number(box?.savingsGoal || 0);
  if (goal <= 0) return null;
  return Math.min((Number(box.balance || 0) / goal) * 100, 100);
}
