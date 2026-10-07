import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../http/client', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { http } from '../../http/client';
import { deleteSavingsBox, listSavingsBoxEvents } from '../accountRepository';

beforeEach(() => vi.clearAllMocks());

describe('deleteSavingsBox', () => {
  it('sends DELETE to the savings-box route with reason and destination', async () => {
    await deleteSavingsBox('b1', { reason: 'objetivo concluído', destinationAccountId: 'b2' });
    expect(http.delete).toHaveBeenCalledWith(
      '/api/accounts/savings-boxes/b1',
      { reason: 'objetivo concluído', destinationAccountId: 'b2' });
  });

  it('omits the destination when there is none', async () => {
    await deleteSavingsBox('b1', { reason: 'sem saldo' });
    expect(http.delete).toHaveBeenCalledWith('/api/accounts/savings-boxes/b1', { reason: 'sem saldo' });
  });

  it('never uses the generic account route', async () => {
    await deleteSavingsBox('b1', { reason: 'x' });
    expect(http.delete.mock.calls[0][0]).not.toBe('/api/accounts/b1');
  });
});

describe('listSavingsBoxEvents', () => {
  it('reads the events route', async () => {
    http.get.mockResolvedValue([]);
    await listSavingsBoxEvents();
    expect(http.get).toHaveBeenCalledWith('/api/accounts/savings-box-events');
  });
});
