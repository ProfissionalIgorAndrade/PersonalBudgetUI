import { useState, useEffect, useCallback } from 'react';
import { listInvitesForMe, listPendingInvitesSent } from '../../../data/repositories/householdRepository';
import { getHouseholdId } from '../../../data/http/client';
import { rowsFromApi } from '../logic/invites';

const idle = { items: [], loading: true, error: '' };

/** Carrega e atualiza as listas de convites recebidos e enviados (pendentes). */
export default function useInvites() {
  const [received, setReceived] = useState(idle);
  const [sent, setSent]         = useState(idle);

  const loadReceived = useCallback(async () => {
    setReceived(s => ({ ...s, loading: true, error: '' }));
    try {
      const raw = await listInvitesForMe();
      setReceived({ items: rowsFromApi(raw), loading: false, error: '' });
    } catch (e) {
      setReceived({ items: [], loading: false, error: e.message || 'Erro ao carregar convites recebidos.' });
    }
  }, []);

  const loadSent = useCallback(async () => {
    const hid = getHouseholdId();
    if (!hid) {
      setSent({ items: [], loading: false, error: '' });
      return;
    }
    setSent(s => ({ ...s, loading: true, error: '' }));
    try {
      const raw = await listPendingInvitesSent(hid);
      setSent({ items: rowsFromApi(raw), loading: false, error: '' });
    } catch (e) {
      setSent({ items: [], loading: false, error: e.message || 'Erro ao carregar convites enviados.' });
    }
  }, []);

  useEffect(() => {
    loadReceived();
    loadSent();
  }, [loadReceived, loadSent]);

  return { received, sent, reloadReceived: loadReceived, reloadSent: loadSent };
}
