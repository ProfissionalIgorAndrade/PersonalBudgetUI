import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import MembersView from '../MembersView';

// O painel de convites tem testes próprios e falaria com a API.
vi.mock('../components/InvitePanel', () => ({ default: () => null }));

afterEach(cleanup);

const members = [
  { id: 'm1', name: 'Igor',   emoji: '🧑', color: '#2dd4bf', userId: 'u1' },
  { id: 'm2', name: 'Família', emoji: '👨‍👩‍👧‍👦', color: '#fb923c' },
  { id: 'm3', name: 'Casal',  emoji: '👪', color: '#818cf8', userId: null },
];

const setup = (over = {}) => {
  const props = {
    members, onAdd: vi.fn(), onEdit: vi.fn(), onDeleteProfile: vi.fn().mockResolvedValue(undefined),
    notify: vi.fn(), onLogout: vi.fn(), ...over,
  };
  render(<MembersView {...props} />);
  return props;
};

describe('MembersView', () => {
  it('splits linked users and profiles into counted sections', () => {
    setup();
    expect(screen.getByText('1 usuário com conta · 2 membros (perfis)')).toBeTruthy();
    const users    = screen.getByLabelText('Usuários');
    const profiles = screen.getByLabelText('Membros');
    expect(users.textContent).toContain('Igor');
    expect(profiles.textContent).toContain('Família');
    expect(profiles.textContent).toContain('Casal');
    expect(profiles.textContent).not.toContain('Igor');
  });

  it('never offers delete for a linked user', () => {
    setup();
    expect(screen.queryByLabelText('Excluir Igor')).toBeNull();
    expect(screen.getByLabelText('Excluir Família')).toBeTruthy();
  });

  it('offers no delete when there is a single profile', () => {
    setup({ members: [members[1]] });
    expect(screen.queryByLabelText('Excluir Família')).toBeNull();
    expect(screen.getByText(/existe apenas um perfil/)).toBeTruthy();
  });

  it('shows the empty state of a section', () => {
    setup({ members: [members[1], members[2]] });
    expect(screen.getByText('Nenhum usuário com conta neste lar.')).toBeTruthy();
  });

  it('opens the merge modal on delete and only the confirmation calls onDeleteProfile', async () => {
    const { onDeleteProfile } = setup();
    fireEvent.click(screen.getByLabelText('Excluir Casal'));
    expect(screen.getByText('Remover membro?')).toBeTruthy();
    expect(onDeleteProfile).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('🗑️ Remover e migrar'));
    await waitFor(() => expect(onDeleteProfile).toHaveBeenCalledWith('m3', 'm1'));
    await waitFor(() => expect(screen.queryByText('Remover membro?')).toBeNull());
  });

  it('cancel closes the modal without deleting', () => {
    const { onDeleteProfile } = setup();
    fireEvent.click(screen.getByLabelText('Excluir Casal'));
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onDeleteProfile).not.toHaveBeenCalled();
    expect(screen.queryByText('Remover membro?')).toBeNull();
  });

  it('edits through the form and sends the trimmed name with the same id', () => {
    const { onEdit, onAdd } = setup();
    fireEvent.click(screen.getByLabelText('Editar Família'));
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: '  Casa  ' } });
    fireEvent.click(screen.getByText('💾 Salvar'));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit.mock.calls[0][0]).toMatchObject({ id: 'm2', name: 'Casa', emoji: '👨‍👩‍👧‍👦', color: '#fb923c' });
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('adds a new member with the neutral default avatar', () => {
    const { onAdd } = setup();
    fireEvent.click(screen.getByText('+ Adicionar Membro'));
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana' } });
    fireEvent.click(screen.getByText('💾 Salvar'));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0][0]).toMatchObject({ name: 'Ana', emoji: '🧑' });
    expect(typeof onAdd.mock.calls[0][0].id).toBe('string');
  });
});
