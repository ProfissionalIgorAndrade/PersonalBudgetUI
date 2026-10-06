import React, { useState } from 'react';
import { inviteMember } from '../../../data/repositories/householdRepository';
import { getHouseholdId } from '../../../data/http/client';
import { emailError } from '../logic/invites';

export default function InviteForm({ disabled, onSent }) {
  const [email, setEmail]     = useState('');
  const [err, setErr]         = useState('');
  const [ok, setOk]           = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const invalid = emailError(email);
    if (invalid) return setErr(invalid);
    const hid = getHouseholdId();
    if (!hid) return setErr('Nenhum lar ativo encontrado.');

    const target = email.trim();
    setLoading(true);
    setErr('');
    setOk('');
    try {
      await inviteMember(hid, target);
      setOk(`Convite enviado para ${target}!`);
      setEmail('');
      await onSent?.();
    } catch (e) {
      setErr(e.message || 'Erro ao enviar convite.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mbr-invite-form">
      <label className="form-label" htmlFor="invite-email">E-mail do convidado</label>
      <input
        id="invite-email"
        className="form-input"
        type="email"
        value={email}
        onChange={e => { setEmail(e.target.value); setErr(''); setOk(''); }}
        placeholder="email@example.com"
        onKeyDown={e => e.key === 'Enter' && send()}
        disabled={loading || disabled}
        aria-invalid={!!err}
      />
      <div aria-live="polite">
        {err && <div className="txxs" role="alert" style={{ color: 'var(--red)', marginTop: 6 }}>{err}</div>}
        {ok  && <div className="txxs" style={{ color: 'var(--green)', marginTop: 6 }}>✓ {ok}</div>}
      </div>
      <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: 10 }}
        onClick={send} disabled={loading || disabled}>
        {loading ? '⏳ Enviando…' : '✉️ Enviar convite'}
      </button>
    </div>
  );
}
