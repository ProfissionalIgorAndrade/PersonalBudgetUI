import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  inviteMember,
  listInvitesForMe,
  listPendingInvitesSent,
  acceptInvite,
} from '../../../api/households';
import { getHouseholdId } from '../../../data/http/client';

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 1.4, paddingBottom: 10, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>{title}</div>
      {children}
    </div>
  );
}

function rowsFromApi(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.invites)) return raw.invites;
  if (Array.isArray(raw.Invites)) return raw.Invites;
  if (Array.isArray(raw.items)) return raw.items;
  if (Array.isArray(raw.Items)) return raw.Items;
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.Data)) return raw.Data;
  return [];
}

function receivedTitle(inv) {
  return (
    inv.householdName
    || inv.HouseholdName
    || inv.household?.name
    || inv.title
    || 'Convite'
  );
}

function receivedHint(inv) {
  return inv.inviterEmail
    || inv.InviterEmail
    || inv.invitedBy
    || inv.senderEmail
    || null;
}

/** Token para AcceptInviteRequest (JSON camelCase `token`) */
function receivedInviteToken(inv) {
  return inv.token
    ?? inv.Token
    ?? inv.inviteToken
    ?? inv.InviteToken
    ?? inv.invitationToken
    ?? inv.InvitationToken;
}

function sentTitle(inv) {
  return inv.inviteeEmail
    || inv.InviteeEmail
    || inv.email
    || inv.Email
    || 'Convite';
}

function sentHint(inv) {
  if (inv.createdAtUtc) return new Date(inv.createdAtUtc).toLocaleString();
  if (inv.createdAt) return new Date(inv.createdAt).toLocaleString();
  if (inv.sentAt) return new Date(inv.sentAt).toLocaleString();
  return null;
}

const RELOGIN_SECONDS = 5;

export default function InvitePanel({ notify, onLogout }) {
  const reloginIntervalRef = useRef(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteErr,   setInviteErr]   = useState('');
  const [inviteOk,    setInviteOk]    = useState('');
  const [loading,     setLoading]     = useState(false);
  const [acceptingToken, setAcceptingToken] = useState(null);
  const [reloginSeconds, setReloginSeconds] = useState(null);

  const [received,     setReceived]     = useState([]);
  const [recLoad,      setRecLoad]      = useState(true);
  const [recErr,       setRecErr]        = useState('');

  const [sentPending,  setSentPending]  = useState([]);
  const [sentLoad,     setSentLoad]     = useState(true);
  const [sentErr,      setSentErr]      = useState('');

  const loadReceived = useCallback(async () => {
    setRecLoad(true);
    setRecErr('');
    try {
      const raw = await listInvitesForMe();
      setReceived(rowsFromApi(raw));
    } catch (e) {
      setRecErr(e.message || 'Erro ao carregar convites recebidos.');
      setReceived([]);
    } finally {
      setRecLoad(false);
    }
  }, []);

  const loadSentPending = useCallback(async () => {
    const hid = getHouseholdId();
    if (!hid) {
      setSentPending([]);
      setSentErr('');
      setSentLoad(false);
      return;
    }
    setSentLoad(true);
    setSentErr('');
    try {
      const raw = await listPendingInvitesSent(hid);
      setSentPending(rowsFromApi(raw));
    } catch (e) {
      setSentErr(e.message || 'Erro ao carregar convites enviados.');
      setSentPending([]);
    } finally {
      setSentLoad(false);
    }
  }, []);

  const refreshLists = useCallback(() => {
    loadReceived();
    loadSentPending();
  }, [loadReceived, loadSentPending]);

  useEffect(() => {
    refreshLists();
  }, [refreshLists]);

  useEffect(() => () => {
    if (reloginIntervalRef.current) {
      clearInterval(reloginIntervalRef.current);
      reloginIntervalRef.current = null;
    }
  }, []);

  const handleAcceptInvite = async (token) => {
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

      let remaining = RELOGIN_SECONDS;
      setReloginSeconds(remaining);
      reloginIntervalRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (reloginIntervalRef.current) {
            clearInterval(reloginIntervalRef.current);
            reloginIntervalRef.current = null;
          }
          setReloginSeconds(null);
          if (typeof onLogout === 'function') onLogout();
          return;
        }
        setReloginSeconds(remaining);
      }, 1000);
    } catch (e) {
      if (notify) {
        notify(
          e.message || 'Não foi possível aceitar o convite. Verifique e tente novamente.',
          'error',
        );
      }
    } finally {
      setAcceptingToken(null);
    }
  };

  const countdownActive = reloginSeconds != null;

  const sendInvite = async () => {
    if (!inviteEmail.trim())                return setInviteErr('Informe um e-mail');
    if (!/\S+@\S+\.\S+/.test(inviteEmail)) return setInviteErr('E-mail inválido');
    const hid = getHouseholdId();
    if (!hid) return setInviteErr('Nenhum lar ativo encontrado.');

    setLoading(true);
    setInviteErr('');
    setInviteOk('');
    try {
      await inviteMember(hid, inviteEmail.trim());
      setInviteOk(`Convite enviado para ${inviteEmail.trim()}!`);
      setInviteEmail('');
      await loadSentPending();
    } catch (e) {
      setInviteErr(e.message || 'Erro ao enviar convite.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    {reloginSeconds != null && reloginSeconds > 0 && (
      <div
        className="modal-overlay"
        style={{ zIndex: 10000 }}
        role="status"
        aria-live="polite"
      >
        <div
          className="card"
          style={{ maxWidth: 420, textAlign: 'center', padding: '24px 22px' }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne', margin: '0 0 10px 0' }}>
            Sessão será encerrada
          </h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, margin: 0 }}>
            Para aplicar o novo acesso ao lar, você precisa entrar novamente.
          </p>
          <div
            style={{
              marginTop: 18,
              fontSize: 36,
              fontWeight: 800,
              fontFamily: 'Syne',
              color: 'var(--primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {reloginSeconds}
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)', margin: '10px 0 0 0' }}>
            segundo(s) até o logout automático
          </p>
        </div>
      </div>
    )}

    <div className="card">
      <Section title="👥 Convidar para o Lar">
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: -10, marginBottom: 16, lineHeight: 1.6 }}>
          Convide outro usuário pelo e-mail. Ele receberá um token para aceitar o convite e acessar este lar.
        </p>

        <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 14, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', marginBottom: 10 }}>Novo Convite</div>
          <div className="form-group" style={{ marginBottom: 8 }}>
            <input
              className="form-input"
              type="email"
              value={inviteEmail}
              onChange={e => { setInviteEmail(e.target.value); setInviteErr(''); setInviteOk(''); }}
              placeholder="email@exemplo.com"
              onKeyDown={e => e.key === 'Enter' && sendInvite()}
              disabled={loading || countdownActive}
            />
          </div>
          {inviteErr && <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 8 }}>{inviteErr}</div>}
          {inviteOk  && <div style={{ fontSize: 11, color: 'var(--green)', marginBottom: 8 }}>✓ {inviteOk}</div>}
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={sendInvite}
            disabled={loading || countdownActive}
          >
            {loading ? '⏳ Enviando…' : '✉️ Enviar Convite'}
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', marginBottom: 10 }}>Convites recebidos</div>
          {recLoad && <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Carregando…</p>}
          {!recLoad && recErr && <p style={{ fontSize: 12, color: 'var(--red)', margin: 0 }}>{recErr}</p>}
          {!recLoad && !recErr && received.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Nenhum convite recebido.</p>
          )}
          {!recLoad && !recErr && received.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {received.map((inv, i) => {
                const hint = receivedHint(inv);
                const tok = receivedInviteToken(inv);
                const busy = acceptingToken === tok;
                return (
                  <li
                    key={inv.id ?? tok ?? inv.inviteId ?? i}
                    style={{
                      background: 'var(--surface2)',
                      borderRadius: 8,
                      padding: '10px 12px',
                      border: '1px solid var(--border)',
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{receivedTitle(inv)}</div>
                      {hint && <div style={{ color: 'var(--muted)', marginTop: 4, fontSize: 11 }}>{hint}</div>}
                      {!tok && <div style={{ color: 'var(--yellow)', marginTop: 6, fontSize: 10 }}>Sem token no convite</div>}
                    </div>
                    {tok && (
                      <button
                        type="button"
                        className="btn-icon"
                        title="Aceitar convite"
                        disabled={!!acceptingToken || countdownActive}
                        onClick={() => handleAcceptInvite(tok)}
                        style={{ flexShrink: 0, fontSize: 18 }}
                      >
                        {busy ? '⏳' : '✅'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', marginBottom: 10 }}>Convites enviados (pendentes)</div>
          {sentLoad && <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Carregando…</p>}
          {!sentLoad && sentErr && <p style={{ fontSize: 12, color: 'var(--red)', margin: 0 }}>{sentErr}</p>}
          {!sentLoad && !sentErr && sentPending.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Nenhum convite pendente enviado.</p>
          )}
          {!sentLoad && !sentErr && sentPending.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sentPending.map((inv, i) => {
                const hint = sentHint(inv);
                return (
                  <li
                    key={inv.id ?? inv.inviteId ?? inv.token ?? i}
                    style={{
                      background: 'var(--surface2)',
                      borderRadius: 8,
                      padding: '10px 12px',
                      border: '1px solid var(--border)',
                      fontSize: 12,
                    }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--text)' }}>{sentTitle(inv)}</div>
                    {hint && <div style={{ color: 'var(--muted)', marginTop: 4, fontSize: 11 }}>{hint}</div>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Section>
    </div>
    </>
  );
}
