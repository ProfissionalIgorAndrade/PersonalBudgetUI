/**
 * Wraps an auth action (login or signup) so that, once it resolves, the app
 * lands on the dashboard regardless of the view the URL hash pointed to.
 *
 * It runs only after the action succeeds: a rejected login keeps the error
 * flowing to the form and does not navigate. It is deliberately not an effect
 * on the session, so reloading the page with an active session keeps the
 * current view.
 *
 * @param {(arg: any) => Promise<any>} action login or signup
 * @param {(view: string) => void} setView
 * @returns {(arg: any) => Promise<void>}
 */
export const redirectToDashboardAfter = (action, setView) => async (arg) => {
  await action(arg);
  setView('dashboard');
};
