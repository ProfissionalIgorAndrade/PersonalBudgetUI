import React, { useState } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { uid, R$ } from '../../utils/format';
import CurrencyInput from '../ui/CurrencyInput';

const EMPTY_PROFILE = {
  firstName: '', lastName: '', nickname: '', email: '', phone: '',
  birthDate: '', cpf: '', occupation: '', monthlyIncome: '',
  pixKey: '', savingsGoalPct: '', currency: 'BRL',
  bio: '',
  address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip: '' },
  notifications: true,
};

const STATES_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
];

const STATUS_CFG = {
  pending:  { label: 'Pendente',  color: 'var(--yellow)' },
  accepted: { label: 'Aceito',    color: 'var(--green)'  },
  declined: { label: 'Recusado',  color: 'var(--red)'    },
};

function Avatar({ initials, size = 56 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, var(--primary), #0d9488)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 800, fontFamily: 'Syne',
      color: '#fff', flexShrink: 0, letterSpacing: 1,
      boxShadow: '0 4px 16px rgba(45,212,191,.3)',
    }}>
      {initials || '?'}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--primary)',
        textTransform: 'uppercase', letterSpacing: 1.4,
        paddingBottom: 10, marginBottom: 16,
        borderBottom: '1px solid var(--border)',
      }}>{title}</div>
      {children}
    </div>
  );
}

export default function Profile() {
  const [profile, setProfile] = useLocalStorage('ff_profile', EMPTY_PROFILE);
  const [invites, setInvites] = useLocalStorage('ff_invites', []);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteErr, setInviteErr] = useState('');

  const set    = (k, v) => setDraft(p => ({ ...p, [k]: v }));
  const setAddr = (k, v) => setDraft(p => ({ ...p, address: { ...p.address, [k]: v } }));

  const openEdit = () => { setDraft({ ...profile, address: { ...(profile.address || {}) } }); setEditing(true); };
  const save     = () => { setProfile(draft); setEditing(false); setDraft(null); };
  const cancel   = () => { setEditing(false); setDraft(null); };

  const sendInvite = () => {
    if (!inviteEmail.trim()) { setInviteErr('Informe um e-mail'); return; }
    if (!/\S+@\S+\.\S+/.test(inviteEmail)) { setInviteErr('E-mail inválido'); return; }
    if (invites.find(i => i.email === inviteEmail.trim())) { setInviteErr('Este e-mail já foi convidado'); return; }
    setInvites(prev => [...prev, {
      id: uid(), email: inviteEmail.trim(), name: inviteName.trim(),
      status: 'pending', date: new Date().toISOString().slice(0, 10),
    }]);
    setInviteEmail(''); setInviteName(''); setInviteErr('');
  };

  const removeInvite = id => setInvites(prev => prev.filter(i => i.id !== id));
  const resendInvite = id => setInvites(prev => prev.map(i =>
    i.id === id ? { ...i, status: 'pending', date: new Date().toISOString().slice(0, 10) } : i
  ));

  const displayName = profile.nickname || profile.firstName || 'Usuário';
  const fullName    = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || '—';
  const initials    = displayName.slice(0, 2).toUpperCase();

  const addr = profile.address || {};

  const Field = ({ label, value }) => (
    <div>
      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: value ? 'var(--text)' : 'var(--muted)' }}>{value || '—'}</div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Meu Perfil</h1>
          <p className="page-sub">Gerencie suas informações e convites</p>
        </div>
        {!editing && (
          <button className="btn btn-primary" onClick={openEdit}>✏️ Editar Perfil</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>

        {/* ── left: profile info ─────────────────────────────── */}
        <div>
          {/* hero card */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <Avatar initials={initials} size={72} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne', marginBottom: 2 }}>{displayName}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{fullName !== displayName ? fullName : ''}</div>
                {profile.email && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>✉️ {profile.email}</div>}
                {profile.occupation && <div style={{ fontSize: 12, color: 'var(--muted)' }}>💼 {profile.occupation}</div>}
              </div>
              {profile.bio && (
                <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', maxWidth: 260, borderLeft: '2px solid var(--border)', paddingLeft: 14 }}>
                  "{profile.bio}"
                </div>
              )}
            </div>
          </div>

          {/* personal data */}
          {!editing ? (
            <>
              <div className="card" style={{ marginBottom: 16 }}>
                <Section title="Dados Pessoais">
                  <div className="grid-2" style={{ gap: 16 }}>
                    <Field label="Nome"           value={profile.firstName} />
                    <Field label="Sobrenome"       value={profile.lastName} />
                    <Field label="Apelido"         value={profile.nickname} />
                    <Field label="E-mail"          value={profile.email} />
                    <Field label="Telefone"        value={profile.phone} />
                    <Field label="Data Nascimento" value={profile.birthDate} />
                    <Field label="CPF"             value={profile.cpf} />
                    <Field label="Profissão"       value={profile.occupation} />
                  </div>
                </Section>

                <Section title="Endereço">
                  <div className="grid-2" style={{ gap: 16 }}>
                    <Field label="CEP"         value={addr.zip} />
                    <Field label="Estado"      value={addr.state} />
                    <Field label="Cidade"      value={addr.city} />
                    <Field label="Bairro"      value={addr.neighborhood} />
                    <Field label="Rua"         value={addr.street} />
                    <Field label="Número"      value={addr.number} />
                    <Field label="Complemento" value={addr.complement} />
                  </div>
                </Section>

                <Section title="Financeiro & Preferências">
                  <div className="grid-2" style={{ gap: 16 }}>
                    <Field label="Renda Mensal (R$)"    value={profile.monthlyIncome ? R$(Number(profile.monthlyIncome)) : ''} />
                    <Field label="Meta de Poupança (%)" value={profile.savingsGoalPct ? profile.savingsGoalPct + '%' : ''} />
                    <Field label="Chave Pix"            value={profile.pixKey} />
                    <Field label="Moeda"                value={profile.currency} />
                  </div>
                </Section>
              </div>
            </>
          ) : (
            /* ── edit form ─────────────────────────────────── */
            <div className="card" style={{ marginBottom: 16 }}>
              <Section title="Dados Pessoais">
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Nome</label>
                    <input className="form-input" value={draft.firstName} onChange={e => set('firstName', e.target.value)} placeholder="João" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sobrenome</label>
                    <input className="form-input" value={draft.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Silva" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Como quer ser chamado</label>
                    <input className="form-input" value={draft.nickname} onChange={e => set('nickname', e.target.value)} placeholder="João" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">E-mail</label>
                    <input className="form-input" type="email" value={draft.email} onChange={e => set('email', e.target.value)} placeholder="joao@email.com" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Telefone / WhatsApp</label>
                    <input className="form-input" value={draft.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Data de Nascimento</label>
                    <input className="form-input" type="date" value={draft.birthDate} onChange={e => set('birthDate', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CPF</label>
                    <input className="form-input" value={draft.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Profissão</label>
                    <input className="form-input" value={draft.occupation} onChange={e => set('occupation', e.target.value)} placeholder="Engenheiro, Médico..." />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: 4 }}>
                  <label className="form-label">Bio / Sobre mim</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={draft.bio}
                    onChange={e => set('bio', e.target.value)}
                    placeholder="Uma frase sobre você..."
                    style={{ resize: 'vertical', minHeight: 60 }}
                  />
                </div>
              </Section>

              <Section title="Endereço">
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">CEP</label>
                    <input className="form-input" value={draft.address.zip} onChange={e => setAddr('zip', e.target.value)} placeholder="00000-000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select className="form-select" value={draft.address.state} onChange={e => setAddr('state', e.target.value)}>
                      <option value="">Selecione</option>
                      {STATES_BR.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cidade</label>
                    <input className="form-input" value={draft.address.city} onChange={e => setAddr('city', e.target.value)} placeholder="São Paulo" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bairro</label>
                    <input className="form-input" value={draft.address.neighborhood} onChange={e => setAddr('neighborhood', e.target.value)} placeholder="Centro" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Rua / Avenida</label>
                    <input className="form-input" value={draft.address.street} onChange={e => setAddr('street', e.target.value)} placeholder="Rua das Flores" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Número</label>
                    <input className="form-input" value={draft.address.number} onChange={e => setAddr('number', e.target.value)} placeholder="123" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Complemento</label>
                    <input className="form-input" value={draft.address.complement} onChange={e => setAddr('complement', e.target.value)} placeholder="Apto 42" />
                  </div>
                </div>
              </Section>

              <Section title="Financeiro & Preferências">
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Renda Mensal (R$)</label>
                    <CurrencyInput value={draft.monthlyIncome} onChange={v => set('monthlyIncome', v)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Meta de Poupança (%)</label>
                    <input className="form-input" type="number" min="0" max="100" value={draft.savingsGoalPct} onChange={e => set('savingsGoalPct', e.target.value)} placeholder="20" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Chave Pix</label>
                    <input className="form-input" value={draft.pixKey} onChange={e => set('pixKey', e.target.value)} placeholder="CPF, e-mail ou telefone" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Moeda</label>
                    <select className="form-select" value={draft.currency} onChange={e => set('currency', e.target.value)}>
                      <option value="BRL">BRL — Real</option>
                      <option value="USD">USD — Dólar</option>
                      <option value="EUR">EUR — Euro</option>
                    </select>
                  </div>
                </div>
              </Section>

              <div className="flex jce" style={{ gap: 8, marginTop: 4 }}>
                <button className="btn btn-secondary" onClick={cancel}>Cancelar</button>
                <button className="btn btn-primary" onClick={save}>💾 Salvar Perfil</button>
              </div>
            </div>
          )}
        </div>

        {/* ── right: invites ─────────────────────────────────── */}
        <div>
          <div className="card">
            <Section title="👥 Grupo Familiar — Convidados">
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: -10, marginBottom: 16, lineHeight: 1.6 }}>
                Convide membros da sua família pelo e-mail. Eles receberão um link para criar a conta e entrar no seu grupo.
              </p>

              {/* invite form */}
              <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 14, marginBottom: 18, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', marginBottom: 10 }}>Novo Convite</div>
                <div className="form-group" style={{ marginBottom: 8 }}>
                  <input
                    className="form-input"
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    placeholder="Nome do convidado"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 8 }}>
                  <input
                    className="form-input"
                    type="email"
                    value={inviteEmail}
                    onChange={e => { setInviteEmail(e.target.value); setInviteErr(''); }}
                    placeholder="email@exemplo.com"
                    onKeyDown={e => e.key === 'Enter' && sendInvite()}
                  />
                </div>
                {inviteErr && <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 8 }}>{inviteErr}</div>}
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={sendInvite}>
                  ✉️ Enviar Convite
                </button>
              </div>

              {/* invite list */}
              {invites.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 12 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                  Nenhum convite enviado ainda
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {invites.map(inv => {
                    const cfg = STATUS_CFG[inv.status] || STATUS_CFG.pending;
                    return (
                      <div key={inv.id} style={{
                        background: 'var(--surface2)', borderRadius: 10,
                        border: '1px solid var(--border)',
                        padding: '10px 12px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {inv.name && <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{inv.name}</div>}
                            <div style={{ fontSize: 11, color: 'var(--muted)', wordBreak: 'break-all' }}>{inv.email}</div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Convidado em {inv.date}</div>
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                            background: cfg.color + '20', color: cfg.color, whiteSpace: 'nowrap',
                          }}>{cfg.label}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          {inv.status === 'pending' && (
                            <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => resendInvite(inv.id)}>
                              🔁 Reenviar
                            </button>
                          )}
                          <button className="btn-icon" style={{ fontSize: 12 }} onClick={() => removeInvite(inv.id)} title="Remover">🗑️</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {invites.length > 0 && (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 16, fontSize: 11, color: 'var(--muted)' }}>
                  {Object.entries(STATUS_CFG).map(([k, v]) => {
                    const count = invites.filter(i => i.status === k).length;
                    return count > 0 ? (
                      <span key={k} style={{ color: v.color, fontWeight: 700 }}>{count} {v.label.toLowerCase()}{count > 1 ? 's' : ''}</span>
                    ) : null;
                  })}
                </div>
              )}
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
