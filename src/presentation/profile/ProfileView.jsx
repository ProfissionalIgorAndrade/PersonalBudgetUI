import React, { useState } from 'react';
import { useLocalStorage } from '../../core/hooks/useLocalStorage';
import ProfileHero from './components/ProfileHero';
import ProfileForm from './components/ProfileForm';
import ChangePasswordModal from './components/ChangePasswordModal';

const EMPTY_PROFILE = {
  firstName: '', lastName: '', nickname: '', email: '', phone: '',
  birthDate: '', cpf: '', occupation: '', monthlyIncome: '',
  pixKey: '', savingsGoalPct: '', currency: 'BRL',
  bio: '',
  address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip: '' },
  notifications: true,
};

export default function ProfileView({ authSession = {}, notify }) {
  const defaultProfile = {
    ...EMPTY_PROFILE,
    firstName: authSession.displayName || authSession.firstName || '',
    email:     authSession.email || '',
  };
  const [profile, setProfile] = useLocalStorage('pb_profile', defaultProfile);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(null);
  const [changingPassword, setChangingPassword] = useState(false);

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
          <p className="page-sub">Gerencie suas informações</p>
        </div>
        {!editing && (
          <div className="flex" style={{ gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setChangingPassword(true)}>🔒 Alterar Senha</button>
            <button className="btn btn-primary" onClick={openEdit}>✏️ Editar Perfil</button>
          </div>
        )}
      </div>

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

      {changingPassword && (
        <ChangePasswordModal
          onClose={() => setChangingPassword(false)}
          onSuccess={() => notify?.('Senha alterada com sucesso.', 'success')}
        />
      )}
    </div>
  );
}
