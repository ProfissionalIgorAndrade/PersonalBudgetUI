/**
 * Minimal JWT inspection. Reads the payload only - the signature is the
 * server's business, and nothing here is a security decision. The point is
 * to avoid rendering an authenticated shell around a token the API is
 * certain to reject.
 */

/** Decodes the payload of a JWT, or null if it is absent or malformed. */
export function decodeJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(decodeURIComponent(
      atob(padded)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    ));
  } catch {
    return null;
  }
}

/**
 * Whether a token is expired, or unusable for any other reason.
 *
 * A token we cannot read counts as expired: the alternative is rendering
 * the app around something the API will reject on every call.
 *
 * `skewSeconds` expires the token slightly early so a request is not fired
 * in the seconds before the boundary and rejected mid-flight.
 */
export function isTokenExpired(token, skewSeconds = 30) {
  const payload = decodeJwt(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
}
