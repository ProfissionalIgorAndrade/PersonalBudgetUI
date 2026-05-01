import React, { useState } from 'react';
import { inviteMember } from '../../../api/households';
import { getHouseholdId } from '../../../data/http/client';

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 1.4, paddingBottom: 10, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>{title}</div>
      {children}
    </div>
  );
}

export default function InvitePanel() {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteErr,   setInviteErr]   = useState('');
  const [inviteOk,    setInviteOk]    = useState('');
  const [loading,     setLoading]     = useState(false);

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
    } catch (e) {
      setInviteErr(e.message || 'Erro ao enviar convite.');
    } finally {
      setLoading(false);
    }
  };

  return (
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
              disabled={loading}
            />
          </div>
          {inviteErr && <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 8 }}>{inviteErr}</div>}
          {inviteOk  && <div style={{ fontSize: 11, color: 'var(--green)', marginBottom: 8 }}>✓ {inviteOk}</div>}
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={sendInvite}
            disabled={loading}
          >
            {loading ? '⏳ Enviando…' : '✉️ Enviar Convite'}
          </button>
        </div>
      </Section>
    </div>
  );
}
