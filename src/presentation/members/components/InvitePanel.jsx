import React, { useState, useEffect, useRef } from 'react';
import { acceptInvite } from '../../../data/repositories/householdRepository';
import useInvites from '../hooks/useInvites';
import InviteForm from './InviteForm';
import ReceivedInvites from './ReceivedInvites';
import SentInvites from './SentInvites';
import ReloginNotice from './ReloginNotice';

const RELOGIN_SECONDS = 5;

export default function InvitePanel({ notify, onLogout }) {
  const { received, sent, reloadSent } = useInvites();
  const intervalRef = useRef(null);
  const [acceptingToken, setAcceptingToken] = useState(null);
  const [reloginSeconds, setReloginSeconds] = useState(null);

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => clearTimer, []);

  const startCountdown = () => {
    let remaining = RELOGIN_SECONDS;
    setReloginSeconds(remaining);
    intervalRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearTimer();
        setReloginSeconds(null);
        if (typeof onLogout === 'function') onLogout();
        return;
      }
      setReloginSeconds(remaining);
    }, 1000);
  };

  const handleAccept = async (token) => {
    if (!token || acceptingToken) return;
    setAcceptingToken(token);
    try {
      await acceptInvite(token);
      if (notify) {
        notify(
          'Convite aceito com sucesso! Em alguns segundos a sessão será encerrada — entre novamente para carregar o novo lar e os dados atualizados.',
          'success',
          RELOGIN_SECONDS * 1000 + 800,
        );
      }
      startCountdown();
    } catch (e) {
      if (notify) {
        notify(e.message || 'Não foi possível aceitar o convite. Verifique e tente novamente.', 'error');
      }
    } finally {
      setAcceptingToken(null);
    }
  };

  const countdownActive = reloginSeconds != null;

  return (
    <>
      {countdownActive && reloginSeconds > 0 && <ReloginNotice seconds={reloginSeconds} />}

      <aside className="card mbr-invite" aria-label="Convites">
        <h2 className="mbr-invite-heading">Convidar para o lar</h2>
        <p className="mbr-hint">
          Convide outro usuário pelo e-mail. Ele receberá um token para aceitar o convite e acessar este lar.
        </p>

        <InviteForm disabled={countdownActive} onSent={reloadSent} />
        <ReceivedInvites
          state={received}
          acceptingToken={acceptingToken}
          disabled={countdownActive}
          onAccept={handleAccept}
        />
        <SentInvites state={sent} />
      </aside>
    </>
  );
}
