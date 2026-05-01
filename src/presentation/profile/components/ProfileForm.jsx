import React from 'react';
import { R$ } from '../../../core/utils/format';
import CurrencyInput from '../../shared/components/CurrencyInput';

const STATES_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
];

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 1.4, paddingBottom: 10, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: value ? 'var(--text)' : 'var(--muted)' }}>{value || '—'}</div>
    </div>
  );
}

export default function ProfileForm({ profile, editing, draft, onChange, onAddressChange, onSave, onCancel, onEdit }) {
  const addr = profile.address || {};

  if (!editing) {
    return (
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
    );
  }

  const set     = (k, v) => onChange({ ...draft, [k]: v });
  const setAddr = (k, v) => onAddressChange(k, v);
  const dAddr   = draft.address || {};

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <Section title="Dados Pessoais">
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Nome</label>
            <input className="form-input" value={draft.firstName || ''} onChange={e => set('firstName', e.target.value)} placeholder="João" />
          </div>
          <div className="form-group">
            <label className="form-label">Sobrenome</label>
            <input className="form-input" value={draft.lastName || ''} onChange={e => set('lastName', e.target.value)} placeholder="Silva" />
          </div>
          <div className="form-group">
            <label className="form-label">Como quer ser chamado</label>
            <input className="form-input" value={draft.nickname || ''} onChange={e => set('nickname', e.target.value)} placeholder="João" />
          </div>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input className="form-input" type="email" value={draft.email || ''} onChange={e => set('email', e.target.value)} placeholder="joao@email.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Telefone / WhatsApp</label>
            <input className="form-input" value={draft.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999" />
          </div>
          <div className="form-group">
            <label className="form-label">Data de Nascimento</label>
            <input className="form-input" type="date" value={draft.birthDate || ''} onChange={e => set('birthDate', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">CPF</label>
            <input className="form-input" value={draft.cpf || ''} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" />
          </div>
          <div className="form-group">
            <label className="form-label">Profissão</label>
            <input className="form-input" value={draft.occupation || ''} onChange={e => set('occupation', e.target.value)} placeholder="Engenheiro, Médico..." />
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 4 }}>
          <label className="form-label">Bio / Sobre mim</label>
          <textarea
            className="form-input"
            rows={2}
            value={draft.bio || ''}
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
            <input className="form-input" value={dAddr.zip || ''} onChange={e => setAddr('zip', e.target.value)} placeholder="00000-000" />
          </div>
          <div className="form-group">
            <label className="form-label">Estado</label>
            <select className="form-select" value={dAddr.state || ''} onChange={e => setAddr('state', e.target.value)}>
              <option value="">Selecione</option>
              {STATES_BR.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Cidade</label>
            <input className="form-input" value={dAddr.city || ''} onChange={e => setAddr('city', e.target.value)} placeholder="São Paulo" />
          </div>
          <div className="form-group">
            <label className="form-label">Bairro</label>
            <input className="form-input" value={dAddr.neighborhood || ''} onChange={e => setAddr('neighborhood', e.target.value)} placeholder="Centro" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Rua / Avenida</label>
            <input className="form-input" value={dAddr.street || ''} onChange={e => setAddr('street', e.target.value)} placeholder="Rua das Flores" />
          </div>
          <div className="form-group">
            <label className="form-label">Número</label>
            <input className="form-input" value={dAddr.number || ''} onChange={e => setAddr('number', e.target.value)} placeholder="123" />
          </div>
          <div className="form-group">
            <label className="form-label">Complemento</label>
            <input className="form-input" value={dAddr.complement || ''} onChange={e => setAddr('complement', e.target.value)} placeholder="Apto 42" />
          </div>
        </div>
      </Section>

      <Section title="Financeiro & Preferências">
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Renda Mensal (R$)</label>
            <CurrencyInput value={draft.monthlyIncome || ''} onChange={v => set('monthlyIncome', v)} />
          </div>
          <div className="form-group">
            <label className="form-label">Meta de Poupança (%)</label>
            <input className="form-input" type="number" min="0" max="100" value={draft.savingsGoalPct || ''} onChange={e => set('savingsGoalPct', e.target.value)} placeholder="20" />
          </div>
          <div className="form-group">
            <label className="form-label">Chave Pix</label>
            <input className="form-input" value={draft.pixKey || ''} onChange={e => set('pixKey', e.target.value)} placeholder="CPF, e-mail ou telefone" />
          </div>
          <div className="form-group">
            <label className="form-label">Moeda</label>
            <select className="form-select" value={draft.currency || 'BRL'} onChange={e => set('currency', e.target.value)}>
              <option value="BRL">BRL — Real</option>
              <option value="USD">USD — Dólar</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </div>
        </div>
      </Section>

      <div className="flex jce" style={{ gap: 8, marginTop: 4 }}>
        <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
        <button className="btn btn-primary" onClick={onSave}>💾 Salvar Perfil</button>
      </div>
    </div>
  );
}
