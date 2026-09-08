/**
 * Remembers the email of the last successful sign-in so the field arrives
 * pre-filled next time.
 *
 * This is a convenience layer on top of the browser's own credential
 * manager, not a replacement for it: it still works when the user declines
 * the save prompt, or on a browser with password saving switched off.
 *
 * Only the email is stored. The password is never written anywhere - that
 * belongs to the browser's credential store and nowhere else.
 */
const KEY = 'pb_last_email';

export const getLastEmail = () => {
  try {
    return localStorage.getItem(KEY) || '';
  } catch {
    // Private mode and some embedded webviews throw on storage access.
    return '';
  }
};

export const setLastEmail = (email) => {
  try {
    if (email) localStorage.setItem(KEY, email);
  } catch {
    // Not being able to remember is not worth failing a login over.
  }
};

export const clearLastEmail = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to do.
  }
};
