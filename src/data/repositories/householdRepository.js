import { http } from '../http/client';

export const listHouseholds = ()            => http.get('/api/households');
export const listProfiles   = (hid)         => http.get(`/api/households/${hid}/profiles`);
export const createProfile  = (hid, name)   => http.post(`/api/households/${hid}/profiles`, { displayName: name });
export const inviteMember   = (hid, email)  => http.post('/api/households/invites', { householdId: hid, inviteeEmail: email });
