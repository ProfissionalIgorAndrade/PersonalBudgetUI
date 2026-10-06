import { describe, it, expect } from 'vitest';
import { normalizeProfile } from '../index';

describe('normalizeProfile default emoji', () => {
  it('uses the family avatar for a Joint profile without emoji', () => {
    expect(normalizeProfile({ id: 'p1', displayName: 'Família', kind: 'Joint', emoji: null }).emoji).toBe('👨‍👩‍👧‍👦');
  });

  it('uses the neutral person for other kinds without emoji', () => {
    expect(normalizeProfile({ id: 'p2', displayName: 'Igor', kind: 'User' }).emoji).toBe('🧑');
    expect(normalizeProfile({ id: 'p3', displayName: 'X' }).emoji).toBe('🧑');
  });

  it('treats an empty string as missing', () => {
    expect(normalizeProfile({ id: 'p4', displayName: 'X', kind: 'Joint', emoji: '' }).emoji).toBe('👨‍👩‍👧‍👦');
  });

  it('keeps a stored emoji, including legacy values outside the catalog', () => {
    expect(normalizeProfile({ id: 'p5', displayName: 'A', emoji: '👮' }).emoji).toBe('👮');
    expect(normalizeProfile({ id: 'p6', displayName: 'B', emoji: '💼', kind: 'Joint' }).emoji).toBe('💼');
  });
});
