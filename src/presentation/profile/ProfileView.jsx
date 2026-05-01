import React, { useState } from 'react';
import { useLocalStorage } from '../../core/hooks/useLocalStorage';
import ProfileHero from './components/ProfileHero';
import ProfileForm from './components/ProfileForm';
import InvitePanel from './components/InvitePanel';

const EMPTY_PROFILE = {
  firstName: '', lastName: '', nickname: '', email: '', phone: '',
  birthDate: '', cpf: '', occupation: '', monthlyIncome: '',
  pixKey: '', savingsGoalPct: '', currency: 'BRL',
  bio: '',
  address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip: '' },
  notifications: true,
};

export default function ProfileView({ authSession = {} }) {
  const defaultProfile = {
    ...EMPTY_PROFILE,
    firstName: authSession.displayName || authSession.firstName || '',
    email:     authSession.email || '',
  };
  const [profile, setProfile] = useLocalStorage('pb_profile', defaultProfile);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(null);

  const openEdit  = () => { setDraft({ ...profile, address: { ...(profile.address || {}) } }); setEditing(true); };
  const save      = () => { setProfile(draft); setEditing(false); setDraft(null); };
  const cancel    = () => { setEditing(false); setDraft(null); };

  const handleAddressChange = (k, v) =>
    setDraft(p => ({ ...p, address: { ...p.address, [k]: v } }));

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
        <div>
          <ProfileHero profile={profile} />
          <ProfileForm
            profile={profile}
            editing={editing}
            draft={draft}
            onChange={setDraft}
            onAddressChange={handleAddressChange}
            onSave={save}
            onCancel={cancel}
            onEdit={openEdit}
          />
        </div>
        <InvitePanel />
      </div>
    </div>
  );
}
