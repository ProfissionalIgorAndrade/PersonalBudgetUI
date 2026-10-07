import { describe, it, expect } from 'vitest';
import { mergeSavingsHistory, boxNameResolver, DELETED_BOX_LABEL } from '../savingsTimeline';
import { normalizeSavingsBoxEvent } from '../../../application/mappers';

const mv = (id, date, extra = {}) => ({ id, type: 'savings', accountId: 'b1', savingsDirection: 'in', amount: 10, date, ...extra });
const ev = (id, date, extra = {}) => ({ id, kind: 'created', accountId: 'b1', boxName: 'Reserva', date, occurredAt: `${date}T10:00:00Z`, ...extra });

describe('mergeSavingsHistory', () => {
  it('merges movements and events, newest first', () => {
    const rows = mergeSavingsHistory(
      [mv('m1', '2026-09-02'), mv('m2', '2026-09-20')],
      [ev('e1', '2026-09-10'), ev('e2', '2026-08-01')]);
    expect(rows.map(r => r.key)).toEqual(['m-m2', 'e-e1', 'm-m1', 'e-e2']);
  });

  it('is deterministic on the same day: event before movement, then id', () => {
    const a = mergeSavingsHistory([mv('m1', '2026-09-10'), mv('m2', '2026-09-10')], [ev('e1', '2026-09-10')]);
    const b = mergeSavingsHistory([mv('m2', '2026-09-10'), mv('m1', '2026-09-10')], [ev('e1', '2026-09-10')]);
    expect(a.map(r => r.key)).toEqual(['e-e1', 'm-m2', 'm-m1']);
    expect(b.map(r => r.key)).toEqual(a.map(r => r.key));
  });

  it('survives empty input', () => {
    expect(mergeSavingsHistory()).toEqual([]);
  });
});

describe('boxNameResolver', () => {
  const boxes = [{ id: 'b1', name: 'Reserva' }];

  it('prefers the active box name', () => {
    const nameOf = boxNameResolver(boxes, [ev('e1', '2026-09-01', { boxName: 'Antigo' })]);
    expect(nameOf('b1')).toBe('Reserva');
  });

  it('falls back to the name recorded on an event of the same box', () => {
    const nameOf = boxNameResolver(boxes, [ev('e1', '2026-09-01', { accountId: 'b9', kind: 'deleted', boxName: 'Viagem' })]);
    expect(nameOf('b9')).toBe('Viagem');
  });

  it('uses the most recent event name when a box was renamed', () => {
    const nameOf = boxNameResolver([], [
      ev('e1', '2026-01-01', { accountId: 'b9', boxName: 'Velho' }),
      ev('e2', '2026-05-01', { accountId: 'b9', kind: 'deleted', boxName: 'Novo' }),
    ]);
    expect(nameOf('b9')).toBe('Novo');
  });

  it('falls back to a generic label when nothing is known', () => {
    expect(boxNameResolver(boxes, [])('zzz')).toBe(DELETED_BOX_LABEL);
  });
});

describe('normalizeSavingsBoxEvent', () => {
  it('normalizes kind, amount and date', () => {
    const e = normalizeSavingsBoxEvent({
      id: 'e1', kind: 'Deleted', accountId: 'b1', boxName: 'Viagem', reason: 'fim',
      amount: '120.5', destinationAccountId: 'b2', destinationName: 'Reserva', occurredAt: '2026-09-20T13:45:00Z',
    });
    expect(e).toMatchObject({
      id: 'e1', kind: 'deleted', accountId: 'b1', boxName: 'Viagem', reason: 'fim',
      amount: 120.5, destinationAccountId: 'b2', destinationName: 'Reserva', date: '2026-09-20',
    });
  });

  it('handles a creation without destination', () => {
    const e = normalizeSavingsBoxEvent({ id: 'e2', kind: 'Created', accountId: 'b1', boxName: 'R', amount: 0, occurredAt: '2026-09-01T00:00:00Z' });
    expect(e.kind).toBe('created');
    expect(e.destinationAccountId).toBeNull();
    expect(e.amount).toBe(0);
  });
});
