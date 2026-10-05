import { describe, it, expect } from 'vitest';
import {
  CATALOG, MANDATORY_IDS, reconcileLayout, defaultLayout, toggleWidget, moveWidget, enabledIds,
} from '../layout';

describe('registry', () => {
  it('has unique ids, no overlap with mandatory widgets, and complete metadata', () => {
    const ids = CATALOG.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some(id => MANDATORY_IDS.includes(id))).toBe(false);
    for (const w of CATALOG) {
      expect(typeof w.title).toBe('string');
      expect(w.description.length > 0).toBe(true);
      expect(w.group.length > 0).toBe(true);
    }
    expect(CATALOG).toHaveLength(19);
  });

  it('defaults to everything off', () => {
    expect(defaultLayout().every(w => w.on === false)).toBe(true);
    expect(enabledIds(defaultLayout())).toEqual([]);
  });
});

describe('reconcileLayout', () => {
  it('returns the default for null and garbage', () => {
    for (const bad of [null, undefined, 'x', 42, {}, [null, 7]]) {
      expect(reconcileLayout(bad)).toEqual(defaultLayout());
    }
  });

  it('drops unknown ids and mandatory ids', () => {
    const r = reconcileLayout([{ id: 'ghost', on: true }, { id: 'verdict', on: true }, { id: 'pace', on: true }]);
    expect(r.map(w => w.id).includes('ghost')).toBe(false);
    expect(r.map(w => w.id).includes('verdict')).toBe(false);
    expect(enabledIds(r)).toEqual(['pace']);
  });

  it('keeps the stored order and on/off, appending new registry widgets off at the end', () => {
    const r = reconcileLayout([{ id: 'weekday', on: true }, { id: 'cashflow', on: false }]);
    expect(r.slice(0, 2)).toEqual([{ id: 'weekday', on: true }, { id: 'cashflow', on: false }]);
    expect(r).toHaveLength(CATALOG.length);
    expect(r.slice(2).every(w => w.on === false)).toBe(true);
  });

  it('removes duplicates and treats a missing "on" as off', () => {
    const r = reconcileLayout([{ id: 'pace', on: true }, { id: 'pace', on: false }, { id: 'rule' }]);
    expect(r.filter(w => w.id === 'pace')).toHaveLength(1);
    expect(r.find(w => w.id === 'pace').on).toBe(true);
    expect(r.find(w => w.id === 'rule').on).toBe(false);
  });

  it('accepts a plain list of ids as enabled', () => {
    expect(enabledIds(reconcileLayout(['rule', 'pace', 'verdict']))).toEqual(['rule', 'pace']);
  });

  it('is idempotent', () => {
    const once = reconcileLayout([{ id: 'rule', on: true }, { id: 'nope', on: true }]);
    expect(reconcileLayout(once)).toEqual(once);
  });
});

describe('toggleWidget / moveWidget', () => {
  it('toggles a single widget immutably', () => {
    const base = defaultLayout();
    const next = toggleWidget(base, 'rule');
    expect(enabledIds(next)).toEqual(['rule']);
    expect(enabledIds(base)).toEqual([]);
  });

  it('moves up and down and ignores moves past the edges', () => {
    const base = defaultLayout();
    const first = base[0].id;
    const second = base[1].id;
    expect(moveWidget(base, second, -1)[0].id).toBe(second);
    expect(moveWidget(base, first, 1)[1].id).toBe(first);
    expect(moveWidget(base, first, -1)).toBe(base);
    expect(moveWidget(base, base.at(-1).id, 1)).toBe(base);
    expect(moveWidget(base, 'ghost', 1)).toBe(base);
  });
});
