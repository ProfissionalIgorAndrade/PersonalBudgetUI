import { describe, it, expect } from 'vitest';
import { statementDueDate } from '../billing';

const ymd = (d) => [d.getFullYear(), d.getMonth() + 1, d.getDate()];
const due = (dueDay, month, year) => ymd(statementDueDate({ dueDay }, month, year));

describe('statementDueDate', () => {
  it('uses the dueDay in the statement month', () => {
    expect(due(7, 10, 2026)).toEqual([2026, 10, 7]);
  });

  it('keeps the last day of a 31-day month', () => {
    expect(due(31, 1, 2026)).toEqual([2026, 1, 31]);
  });

  it('clamps dueDay 31 to the 30th in a 30-day month', () => {
    expect(due(31, 4, 2026)).toEqual([2026, 4, 30]);
  });

  it('clamps to the 28th in February of a common year', () => {
    expect(due(31, 2, 2027)).toEqual([2027, 2, 28]);
    expect(due(29, 2, 2027)).toEqual([2027, 2, 28]);
  });

  it('allows the 29th in February of a leap year', () => {
    expect(due(31, 2, 2028)).toEqual([2028, 2, 29]);
    expect(due(29, 2, 2028)).toEqual([2028, 2, 29]);
  });

  it('does not clamp when the dueDay fits (28 in February)', () => {
    expect(due(28, 2, 2027)).toEqual([2027, 2, 28]);
  });

  it('stays in the statement month across the year boundary', () => {
    expect(due(5, 12, 2026)).toEqual([2026, 12, 5]);
    expect(due(5, 1, 2027)).toEqual([2027, 1, 5]);
  });

  it('returns null when data is missing or invalid', () => {
    expect(statementDueDate(null, 10, 2026)).toBeNull();
    expect(statementDueDate({}, 10, 2026)).toBeNull();
    expect(statementDueDate({ dueDay: 0 }, 10, 2026)).toBeNull();
    expect(statementDueDate({ dueDay: 7 }, null, 2026)).toBeNull();
    expect(statementDueDate({ dueDay: 7 }, 13, 2026)).toBeNull();
    expect(statementDueDate({ dueDay: 7 }, 10, null)).toBeNull();
    expect(statementDueDate({ dueDay: 7 }, undefined, undefined)).toBeNull();
  });
});
