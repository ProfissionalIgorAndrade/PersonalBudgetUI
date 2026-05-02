import { http } from '../http/client';

export const listHouseholds = ()            => http.get('/api/households');
export const listProfiles   = (hid)         => http.get(`/api/households/${hid}/profiles`);
export const createProfile  = (hid, name)   => http.post(`/api/households/${hid}/profiles`, { displayName: name });
export const inviteMember   = (hid, email)  => http.post('/api/households/invites', { householdId: hid, inviteeEmail: email });

/** Convites recebidos pelo utilizador logado */
export const listInvitesForMe = () => http.get('/api/households/invites/me');

/** Convites enviados por este lar que ainda estão pendentes */
export const listPendingInvitesSent = (hid) =>
  http.get(`/api/households/${hid}/invites/pending`);

export const acceptInvite = (token) =>
  http.post('/api/households/invites/accept', { token });

export const deleteProfileMerge = (hid, removeProfileId, mergeIntoProfileId) =>
  http.post(`/api/households/${hid}/profiles/delete`, {
    removeProfileId,
    mergeIntoProfileId,
  });
