import React, { useState, useMemo, useCallback } from 'react';
import { uid } from '../../core/utils/format';
import { COLORS } from '../../core/constants/index';
import { defaultAvatarFor } from '../../core/constants/avatars';
import MemberTile from './components/MemberTile';
import MemberSection from './components/MemberSection';
import MemberForm from './components/MemberForm';
import InvitePanel from './components/InvitePanel';
import DeleteMemberModal from './components/DeleteMemberModal';

const hasLogin = (m) => m?.userId != null && m.userId !== '';

export default function MembersView({ members, onAdd, onEdit, onDeleteProfile, notify, onLogout }) {
  const [showForm, setShowForm]         = useState(false);
  const [f, setF]                       = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { linkedUsers, householdProfiles } = useMemo(() => ({
    linkedUsers:       members.filter(hasLogin),
    householdProfiles: members.filter(m => !hasLogin(m)),
  }), [members]);

  const mergeCandidates = useMemo(
    () => (deleteTarget ? members.filter(m => m.id !== deleteTarget.id) : []),
    [members, deleteTarget],
  );

  const canDeleteProfile = members.length > 1;

  const openNew  = () => { setF({ name: '', color: COLORS[0], emoji: defaultAvatarFor() }); setShowForm(true); };
  const openEdit = (m) => { setF(m); setShowForm(true); };
  const save     = () => {
    const m = { ...f, name: (f.name || '').trim(), id: f.id || uid() };
    f.id ? onEdit(m) : onAdd(m);
    setShowForm(false);
  };

  const openDeleteModal = useCallback((m) => {
    if (!canDeleteProfile) return;
    setDeleteTarget(m);
  }, [canDeleteProfile]);

  const handleConfirmDelete = useCallback(async (mergeIntoProfileId) => {
    if (!deleteTarget || !mergeIntoProfileId) return;
    setDeleteLoading(true);
    try {
      await onDeleteProfile(deleteTarget.id, mergeIntoProfileId);
      setDeleteTarget(null);
    } catch {
      /* notify vem do hook */
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, onDeleteProfile]);

  const nUsers    = linkedUsers.length;
  const nProfiles = householdProfiles.length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Membros da Família</h1>
          <p className="page-sub">
            {nUsers} {nUsers === 1 ? 'usuário' : 'usuários'} com conta · {nProfiles} {nProfiles === 1 ? 'membro' : 'membros'} (perfis)
          </p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Adicionar Membro</button>
      </div>

      <div className="mbr-layout">
        <div className="mbr-main">
          <MemberSection
            title="Usuários"
            count={nUsers}
            hint="Pessoas com login que participam deste lar."
            emptyText="Nenhum usuário com conta neste lar."
          >
            {linkedUsers.map(m => (
              <MemberTile key={m.id} member={m} onEdit={openEdit} />
            ))}
          </MemberSection>

          <MemberSection
            title="Membros"
            count={nProfiles}
            hint="Perfis do lar para despesas e planejamento. Quem não tem usuário próprio aparece aqui."
            emptyText="Nenhum membro só com perfil (sem conta)."
            onAdd={openNew}
            note={!canDeleteProfile && nProfiles > 0 ? 'Não é possível excluir: existe apenas um perfil neste lar.' : undefined}
          >
            {householdProfiles.map(m => (
              <MemberTile
                key={m.id}
                member={m}
                onEdit={openEdit}
                onDelete={canDeleteProfile ? openDeleteModal : undefined}
              />
            ))}
          </MemberSection>
        </div>

        <InvitePanel notify={notify} onLogout={onLogout} />
      </div>

      {showForm && (
        <MemberForm f={f} onChange={setF} onSave={save} onClose={() => setShowForm(false)} />
      )}

      {deleteTarget && (
        <DeleteMemberModal
          memberToRemove={deleteTarget}
          mergeCandidates={mergeCandidates}
          onClose={() => !deleteLoading && setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}
