/**
 * Leitura tolerante das respostas de convites: a API já devolveu listas puras
 * e objetos com a lista em chaves diferentes, e os campos variam de caixa.
 */
export function rowsFromApi(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  const keys = ['invites', 'Invites', 'items', 'Items', 'data', 'Data'];
  for (const k of keys) if (Array.isArray(raw[k])) return raw[k];
  return [];
}

export function receivedTitle(inv) {
  return (
    inv.householdName
    || inv.HouseholdName
    || inv.household?.name
    || inv.title
    || 'Convite'
  );
}

export function receivedHint(inv) {
  return inv.inviterEmail
    || inv.InviterEmail
    || inv.invitedBy
    || inv.senderEmail
    || null;
}

/** Token para AcceptInviteRequest (JSON camelCase `token`) */
export function receivedInviteToken(inv) {
  return inv.token
    ?? inv.Token
    ?? inv.inviteToken
    ?? inv.InviteToken
    ?? inv.invitationToken
    ?? inv.InvitationToken;
}

export function sentTitle(inv) {
  return inv.inviteeEmail
    || inv.InviteeEmail
    || inv.email
    || inv.Email
    || 'Convite';
}

const fmtDate = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString('pt-BR');
};

export function sentHint(inv) {
  const raw = inv.createdAtUtc || inv.createdAt || inv.sentAt;
  return raw ? fmtDate(raw) : null;
}

/** Devolve a mensagem de erro do e-mail, ou '' quando válido. */
export function emailError(email) {
  if (!email.trim()) return 'Informe um e-mail';
  if (!/\S+@\S+\.\S+/.test(email)) return 'E-mail inválido';
  return '';
}
