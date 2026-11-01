import React, { useState } from 'react';
import { useLocalStorage } from '../../core/hooks/useLocalStorage';
import PanelHeader from '../shared/components/PanelHeader';
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

/** Perfil salvo por cima do vazio e do que a sessão já sabe (nome, e-mail). */
export function withDefaults(stored = {}, authSession = {}) {
  return {
    ...EMPTY_PROFILE,
    firstName: authSession.displayName || authSession.firstName || '',
    email:     authSession.email || '',
    ...stored,
    address: { ...EMPTY_PROFILE.address, ...(stored.address || {}) },
  };
}

/**
 * Seção "Meu perfil" de Meu Lar. Quem guarda o perfil é o App (a sidebar
 * mostra o mesmo nome); sem `profile`/`onProfileChange` a seção usa o
 * localStorage por conta própria.
 */
export default function ProfileView({ authSession = {}, notify, profile: storedProp, onProfileChange, titleId = 'hh-profile-title' }) {
  const [storedLocal, setStoredLocal] = useLocalStorage('pb_profile', {});
  const stored     = storedProp ?? storedLocal;
  const setStored  = onProfileChange ?? setStoredLocal;
  const profile    = withDefaults(stored, authSession);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const openEdit  = () => { setDraft({ ...profile, address: { ...profile.address } }); setEditing(true); };
  const save      = () => {
    setStored(draft);
    setEditing(false);
    setDraft(null);
    notify?.('Perfil salvo.', 'success');
  };
  const cancel    = () => { setEditing(false); setDraft(null); };

  const handleAddressChange = (k, v) =>
    setDraft(p => ({ ...p, address: { ...p.address, [k]: v } }));

  return (
    <div>
      <PanelHeader id={titleId} title="Meu perfil" sub="Seus dados pessoais ficam salvos só neste navegador.">
        {!editing && (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setChangingPassword(true)}>🔒 Alterar senha</button>
            <button type="button" className="btn btn-primary" onClick={openEdit}>✏️ Editar perfil</button>
          </>
        )}
      </PanelHeader>

      <ProfileHero profile={editing ? draft : profile} />
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

      {changingPassword && (
        <ChangePasswordModal
          onClose={() => setChangingPassword(false)}
          onSuccess={() => notify?.('Senha alterada com sucesso.', 'success')}
        />
      )}
    </div>
  );
}
