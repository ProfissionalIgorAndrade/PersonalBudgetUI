/**
 * Orçamentos do mês a partir das categorias de despesa e dos limites que o
 * servidor devolve (cada limite já traz o gasto do mês em `spentAmount`).
 * Categoria sem limite não tem gasto calculado pelo servidor, por isso os
 * totais somam só as categorias com limite.
 */

/** A partir de quanto do limite a categoria aparece como "perto do limite". */
export const NEAR_RATIO = 0.85;

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** "2026-10" → "outubro de 2026". */
export function monthName(ym) {
  const [y, m] = String(ym || '').split('-').map(Number);
  if (!y || !m) return '';
  return `${MONTHS[m - 1]} de ${y}`;
}

export function statusOf(spent, limit) {
  if (!limit) return 'none';
  if (spent > limit) return 'over';
  if (spent >= limit * NEAR_RATIO) return 'near';
  return 'ok';
}

const ORDER = { over: 0, near: 1, ok: 2 };

/**
 * Uma linha por categoria de despesa. As com limite vêm primeiro, das que
 * estouraram (mais acima do limite primeiro) às mais folgadas; as sem limite
 * por último, em ordem alfabética.
 */
export function budgetRows(categories = [], budgets = []) {
  const byCat = new Map(budgets.map(b => [b.categoryId, b]));
  const rows = categories
    .filter(c => c.type === 'expense')
    .map(cat => {
      const budget = byCat.get(cat.id) ?? null;
      const limit = Number(budget?.limitAmount) || 0;
      const spent = Number(budget?.spentAmount) || 0;
      return {
        cat, budget, limit, spent,
        ratio: limit ? spent / limit : null,
        status: statusOf(spent, limit),
      };
    });

  const limited = rows.filter(r => r.status !== 'none').sort((a, b) =>
    ORDER[a.status] - ORDER[b.status]
    || (a.status === 'over' ? (b.spent - b.limit) - (a.spent - a.limit) : b.ratio - a.ratio)
    || a.cat.name.localeCompare(b.cat.name, 'pt-BR'));
  const free = rows.filter(r => r.status === 'none')
    .sort((a, b) => a.cat.name.localeCompare(b.cat.name, 'pt-BR'));

  return { limited, free };
}

/** Totais do mês, somados das linhas como aparecem na tela. */
export function budgetSummary({ limited, free }) {
  const limit = limited.reduce((s, r) => s + r.limit, 0);
  const spent = limited.reduce((s, r) => s + r.spent, 0);
  const over  = limited.filter(r => r.status === 'over');
  return {
    limit,
    spent,
    left: limit - spent,
    ratio: limit ? spent / limit : null,
    overCount: over.length,
    overAmount: over.reduce((s, r) => s + (r.spent - r.limit), 0),
    nearCount: limited.filter(r => r.status === 'near').length,
    limitedCount: limited.length,
    freeCount: free.length,
  };
}

/** "2026-01" → "2025-12". */
export function previousMonth(ym) {
  const [y, m] = String(ym || '').split('-').map(Number);
  if (!y || !m) return '';
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

/**
 * O que copiar os limites do mês anterior faz no mês atual: cria os que
 * faltam e troca o valor dos que estão diferentes. Limites que só o mês atual
 * tem ficam como estão; os de categorias que não existem mais são ignorados.
 */
export function copyPlan(previous = [], current = [], categories = []) {
  const known = new Map(categories.filter(c => c.type === 'expense').map(c => [c.id, c]));
  const now   = new Map(current.map(b => [b.categoryId, b]));
  const create = [];
  const update = [];
  let same = 0;
  for (const pb of previous) {
    const cat = known.get(pb.categoryId);
    const limitAmount = Number(pb.limitAmount) || 0;
    if (!cat || limitAmount <= 0) continue;
    const cur = now.get(pb.categoryId);
    if (!cur) create.push({ cat, limitAmount });
    else if (Number(cur.limitAmount) !== limitAmount) update.push({ cat, limitAmount, from: Number(cur.limitAmount) });
    else same += 1;
  }
  const byName = (a, b) => a.cat.name.localeCompare(b.cat.name, 'pt-BR');
  return { create: create.sort(byName), update: update.sort(byName), same };
}

/** Percentual inteiro para exibir; acima de 999% vira ">999%". */
export function pctLabel(ratio) {
  if (ratio == null) return '—';
  const p = Math.round(ratio * 100);
  return p > 999 ? '>999%' : `${p}%`;
}
