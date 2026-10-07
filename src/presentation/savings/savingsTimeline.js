/**
 * Histórico do cofrinho: depósitos e resgates (lançamentos) junto com a
 * criação e exclusão de caixinhas (eventos), numa linha do tempo só.
 */

export const DELETED_BOX_LABEL = 'Caixinha excluída';

const dayOf = (v) => String(v || '').slice(0, 10);

/**
 * Mescla movimentos e eventos, mais recentes primeiro.
 *
 * Os dois só têm o dia em comum, então o desempate é fixo: no mesmo dia o
 * evento vem antes do movimento, e depois pelo id. Assim a ordem não muda
 * entre renderizações.
 */
export function mergeSavingsHistory(movements = [], events = []) {
  const rows = [
    ...movements.map(m => ({ source: 'movement', key: `m-${m.id}`, date: dayOf(m.date), item: m })),
    ...events.map(e => ({ source: 'event', key: `e-${e.id}`, date: dayOf(e.date || e.occurredAt), item: e })),
  ];
  return rows.sort((a, b) =>
    b.date.localeCompare(a.date)
    || (a.source === b.source ? 0 : a.source === 'event' ? -1 : 1)
    || String(b.item.id).localeCompare(String(a.item.id)));
}

/**
 * Resolve o nome de uma caixinha pelo id: a conta ativa, senão o nome gravado
 * no evento mais recente daquela caixinha, senão um rótulo genérico. Uma
 * caixinha excluída some das contas, mas seus movimentos continuam no extrato.
 */
export function boxNameResolver(boxes = [], events = []) {
  const byId = new Map(boxes.map(b => [b.id, b.name]));
  for (const e of [...events].sort((a, b) => dayOf(b.date).localeCompare(dayOf(a.date)))) {
    if (e.boxName && !byId.has(e.accountId)) byId.set(e.accountId, e.boxName);
  }
  return (id) => byId.get(id) || DELETED_BOX_LABEL;
}
