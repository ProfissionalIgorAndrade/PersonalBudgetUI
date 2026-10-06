import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act, waitFor } from '@testing-library/react';
import React from 'react';
import InvitePanel from '../InvitePanel';
import * as repo from '../../../../data/repositories/householdRepository';

vi.mock('../../../../data/repositories/householdRepository', () => ({
  listInvitesForMe: vi.fn(),
  listPendingInvitesSent: vi.fn(),
  inviteMember: vi.fn(),
  acceptInvite: vi.fn(),
}));

const received = [{ id: 'i1', householdName: 'Casa Silva', inviterEmail: 'ana@example.com', token: 'tok1' }];
const sent     = { invites: [{ id: 's1', inviteeEmail: 'bob@example.com', createdAtUtc: '2026-03-05T12:00:00Z' }] };

beforeEach(() => {
  localStorage.setItem('pb_household_id', 'h1');
  repo.listInvitesForMe.mockResolvedValue(received);
  repo.listPendingInvitesSent.mockResolvedValue(sent);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
  localStorage.clear();
});

describe('InvitePanel lists', () => {
  it('loads received and sent invites through the repository', async () => {
    render(<InvitePanel notify={vi.fn()} onLogout={vi.fn()} />);
    expect(await screen.findByText('Casa Silva')).toBeTruthy();
    expect(screen.getByText('ana@example.com')).toBeTruthy();
    expect(await screen.findByText('bob@example.com')).toBeTruthy();
    expect(screen.getByText(/05\/03\/2026/)).toBeTruthy();
    expect(repo.listPendingInvitesSent).toHaveBeenCalledWith('h1');
  });

  it('shows the empty states', async () => {
    repo.listInvitesForMe.mockResolvedValue([]);
    repo.listPendingInvitesSent.mockResolvedValue([]);
    render(<InvitePanel notify={vi.fn()} onLogout={vi.fn()} />);
    expect(await screen.findByText('Nenhum convite recebido.')).toBeTruthy();
    expect(await screen.findByText('Nenhum convite pendente enviado.')).toBeTruthy();
  });

  it('shows the load error of a list', async () => {
    repo.listInvitesForMe.mockRejectedValue(new Error('falhou'));
    render(<InvitePanel notify={vi.fn()} onLogout={vi.fn()} />);
    expect(await screen.findByText('falhou')).toBeTruthy();
  });
});

describe('InvitePanel send', () => {
  const type = (v) => fireEvent.change(screen.getByLabelText('E-mail do convidado'), { target: { value: v } });

  it('requires an email and rejects an invalid one without calling the API', async () => {
    render(<InvitePanel notify={vi.fn()} onLogout={vi.fn()} />);
    await screen.findByText('Casa Silva');
    fireEvent.click(screen.getByText('✉️ Enviar convite'));
    expect(screen.getByRole('alert').textContent).toBe('Informe um e-mail');
    type('abc');
    fireEvent.click(screen.getByText('✉️ Enviar convite'));
    expect(screen.getByRole('alert').textContent).toBe('E-mail inválido');
    expect(repo.inviteMember).not.toHaveBeenCalled();
  });

  it('sends a valid invite, confirms and reloads the sent list', async () => {
    repo.inviteMember.mockResolvedValue({});
    render(<InvitePanel notify={vi.fn()} onLogout={vi.fn()} />);
    await screen.findByText('Casa Silva');
    type(' new@example.com ');
    fireEvent.click(screen.getByText('✉️ Enviar convite'));
    expect(await screen.findByText(/Convite enviado para new@example.com!/)).toBeTruthy();
    expect(repo.inviteMember).toHaveBeenCalledWith('h1', 'new@example.com');
    expect(repo.listPendingInvitesSent).toHaveBeenCalledTimes(2);
  });
});

describe('InvitePanel accept flow', () => {
  it('notifies, counts down 5 s and then logs out', async () => {
    repo.acceptInvite.mockResolvedValue({});
    const notify = vi.fn();
    const onLogout = vi.fn();
    render(<InvitePanel notify={notify} onLogout={onLogout} />);
    const accept = await screen.findByLabelText('Aceitar convite de Casa Silva');

    vi.useFakeTimers();
    await act(async () => { fireEvent.click(accept); });

    expect(repo.acceptInvite).toHaveBeenCalledWith('tok1');
    expect(notify.mock.calls[0][1]).toBe('success');
    expect(screen.getByText('Sessão será encerrada')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();

    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText('4')).toBeTruthy();
    expect(onLogout).not.toHaveBeenCalled();

    await act(async () => { vi.advanceTimersByTime(4000); });
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Sessão será encerrada')).toBeNull();
  });

  it('notifies the error and does not start the countdown when accepting fails', async () => {
    repo.acceptInvite.mockRejectedValue(new Error('token expirado'));
    const notify = vi.fn();
    render(<InvitePanel notify={notify} onLogout={vi.fn()} />);
    fireEvent.click(await screen.findByLabelText('Aceitar convite de Casa Silva'));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('token expirado', 'error'));
    expect(screen.queryByText('Sessão será encerrada')).toBeNull();
  });
});
