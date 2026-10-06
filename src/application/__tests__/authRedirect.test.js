import { describe, it, expect } from 'vitest';
import { redirectToDashboardAfter } from '../authRedirect';

describe('redirectToDashboardAfter', () => {
  it('forwards the argument and goes to the dashboard after a successful action', async () => {
    const calls = [];
    const action = async (arg) => { calls.push(['action', arg]); };
    const setView = (v) => calls.push(['view', v]);
    await redirectToDashboardAfter(action, setView)({ email: 'a@b.c' });
    expect(calls).toEqual([['action', { email: 'a@b.c' }], ['view', 'dashboard']]);
  });

  it('does not navigate when the action rejects, and propagates the error', async () => {
    const views = [];
    const action = async () => { throw new Error('bad credentials'); };
    let error = null;
    try {
      await redirectToDashboardAfter(action, (v) => views.push(v))({});
    } catch (e) { error = e; }
    expect(error.message).toBe('bad credentials');
    expect(views).toEqual([]);
  });
});
