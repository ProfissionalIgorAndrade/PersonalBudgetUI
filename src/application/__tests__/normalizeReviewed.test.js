import { describe, it, expect } from 'vitest';
import { normalizeTransaction } from '../mappers';

describe('normalizeTransaction reviewed', () => {
  it('keeps reviewed from the API', () => {
    expect(normalizeTransaction({ id: '1', reviewed: true }).reviewed).toBe(true);
  });
  it('accepts isReviewed as a fallback', () => {
    expect(normalizeTransaction({ id: '1', isReviewed: true }).reviewed).toBe(true);
  });
  it('defaults to false when absent', () => {
    expect(normalizeTransaction({ id: '1' }).reviewed).toBe(false);
  });
});
