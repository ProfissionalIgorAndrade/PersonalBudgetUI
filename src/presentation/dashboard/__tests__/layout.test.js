import { describe, it, expect } from 'vitest';
import { reconcileLayout } from '../layout';

const defaults = [
  { id: 'cashflow',  col: 0, order: 0, visible: true },
  { id: 'donut',     col: 0, order: 1, visible: true },
  { id: 'cat-trend', col: 0, order: 4, visible: true },
  { id: 'faturas',   col: 1, order: 0, visible: true },
];
const ids = (l) => l.map(w => w.id);

describe('reconcileLayout', () => {
  // The screenshot showed the trend widget's controls twice. A duplicated id
  // in storage renders the same widget twice, each with its own state,
  // sharing one slot.
  it('drops a duplicated id', () => {
    const out = reconcileLayout(
      [{ id: 'cashflow' }, { id: 'cat-trend' }, { id: 'cat-trend' }], defaults);
    expect(out.filter(w => w.id === 'cat-trend')).toHaveLength(1);
  });

  it('adds a widget the stored layout never heard of', () => {
    expect(ids(reconcileLayout([{ id: 'cashflow' }, { id: 'donut' }], defaults)))
      .toContain('cat-trend');
  });

  it('places a new widget after what the user already arranged', () => {
    const out = reconcileLayout([{ id: 'cashflow', col: 0, order: 0 }, { id: 'donut', col: 0, order: 1 }], defaults);
    expect(out.find(w => w.id === 'cat-trend').order).toBe(2);
  });

  it('drops an id the app no longer has', () => {
    expect(ids(reconcileLayout([{ id: 'cashflow' }, { id: 'widget-extinto' }], defaults)))
      .not.toContain('widget-extinto');
  });

  it('preserves the column, order and visibility the user chose', () => {
    const out = reconcileLayout([{ id: 'cashflow', col: 1, order: 7, visible: false }], defaults);
    const w = out.find(x => x.id === 'cashflow');
    expect([w.col, w.order, w.visible]).toEqual([1, 7, false]);
  });

  it('returns the full default set for empty or broken storage', () => {
    expect(ids(reconcileLayout(null, defaults))).toEqual(ids(defaults));
    expect(ids(reconcileLayout([], defaults))).toEqual(ids(defaults));
    expect(ids(reconcileLayout('lixo', defaults))).toEqual(ids(defaults));
  });

  it('never returns duplicates, whatever the input', () => {
    const out = reconcileLayout([{ id: 'donut' }, { id: 'donut' }, { id: 'donut' }], defaults);
    expect(new Set(ids(out)).size).toBe(out.length);
  });
});
