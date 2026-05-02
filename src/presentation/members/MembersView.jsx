import React, { useState, useMemo, useCallback } from 'react';
import { uid } from '../../core/utils/format';
import { COLORS } from '../../core/constants/index';
import MemberCard from './components/MemberCard';
import MemberForm from './components/MemberForm';
import InvitePanel from './components/InvitePanel';
import DeleteMemberModal from './components/DeleteMemberModal';

function SectionHeading({ title, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 1.2, margin: '0 0 6px 0' }}>
        {title}
      </h2>
      {hint && (
        <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export default function MembersView({ members, onAdd, onEdit, onDeleteProfile, notify, onLogout }) {
  const [showForm, setShowForm]   = useState(false);
  const [f, setF]                 = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const linkedUsers = useMemo(
    () => members.filter(m => m?.userId != null && m.userId !== ''),
    [members],
  );
  const householdProfiles = useMemo(
    () => members.filter(m => m?.userId == null || m.userId === ''),
    [members],
  );

  const mergeCandidates = useMemo(() => {
    if (!deleteTarget) return [];
    return members.filter(m => m.id !== deleteTarget.id);
  }, [members, deleteTarget]);

  const canDeleteProfile = members.length > 1;

  const openNew  = () => { setF({ name: '', type: 'me', color: COLORS[0], emoji: '👤' }); setShowForm(true); };
  const save     = () => {
    const m = { ...f, id: f.id || uid() };
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Membros da Família</h1>
          <p className="page-sub">
            {linkedUsers.length} utilizador(es) com conta · {householdProfiles.length} membro(s) (perfil)
          </p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Adicionar Membro</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, minWidth: 0 }}>
          <section>
            <SectionHeading
              title="Usuários"
              hint="Pessoas com login que participam deste lar."
            />
            {linkedUsers.length === 0 ? (
              <p className="txxs tmuted" style={{ margin: 0 }}>Nenhum utilizador com conta neste lar.</p>
            ) : (
              <div className="grid-3">
                {linkedUsers.map(m => (
                  <MemberCard
                    key={m.id}
                    member={m}
                    showDelete={false}
                    onEdit={() => { setF(m); setShowForm(true); }}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionHeading
              title="Membros"
              hint="Perfis do lar para despesas e planeamento. Quem não tem utilizador próprio aparece aqui."
            />
            {householdProfiles.length === 0 ? (
              <p className="txxs tmuted" style={{ margin: 0 }}>Nenhum membro só com perfil (sem conta).</p>
            ) : (
              <div className="grid-3">
                {householdProfiles.map(m => (
                  <MemberCard
                    key={m.id}
                    member={m}
                    showDelete={canDeleteProfile}
                    onEdit={() => { setF(m); setShowForm(true); }}
                    onDelete={canDeleteProfile ? () => openDeleteModal(m) : undefined}
                  />
                ))}
              </div>
            )}
            {!canDeleteProfile && householdProfiles.length > 0 && (
              <p className="txxs tmuted" style={{ margin: '10px 0 0 0' }}>
                Não é possível excluir: existe apenas um perfil neste lar.
              </p>
            )}
          </section>
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
