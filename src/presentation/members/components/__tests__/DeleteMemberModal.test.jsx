import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import DeleteMemberModal from '../DeleteMemberModal';

afterEach(cleanup);

const target = { id: 'p3', name: 'Casal', emoji: '👪' };
const candidates = [
  { id: 'm1', name: 'Igor', emoji: '🧑' },
  { id: 'm2', name: 'Família', emoji: '👨‍👩‍👧‍👦' },
];

const modal = (over = {}) => (
  <DeleteMemberModal
    memberToRemove={target}
    mergeCandidates={candidates}
    onClose={() => {}}
    onConfirm={() => {}}
    loading={false}
    {...over}
  />
);

describe('DeleteMemberModal', () => {
  it('uses the danger button and names the member', () => {
    render(modal());
    expect(screen.getByText('🗑️ Remover e migrar').className).toContain('btn-danger');
    expect(screen.getByText('Casal')).toBeTruthy();
  });

  it('defaults to the first candidate', () => {
    const onConfirm = vi.fn();
    render(modal({ onConfirm }));
    fireEvent.click(screen.getByText('🗑️ Remover e migrar'));
    expect(onConfirm).toHaveBeenCalledWith('m1');
  });

  it('confirms the chosen candidate', () => {
    const onConfirm = vi.fn();
    render(modal({ onConfirm }));
    fireEvent.change(screen.getByLabelText('Migrar dados para o perfil'), { target: { value: 'm2' } });
    fireEvent.click(screen.getByText('🗑️ Remover e migrar'));
    expect(onConfirm).toHaveBeenCalledWith('m2');
  });

  it('falls back to the first candidate when the chosen one disappears', () => {
    const onConfirm = vi.fn();
    const { rerender } = render(modal({ onConfirm }));
    fireEvent.change(screen.getByLabelText('Migrar dados para o perfil'), { target: { value: 'm2' } });
    rerender(modal({ onConfirm, mergeCandidates: [candidates[0]] }));
    fireEvent.click(screen.getByText('🗑️ Remover e migrar'));
    expect(onConfirm).toHaveBeenCalledWith('m1');
  });

  it('disables confirm without candidates and while loading', () => {
    const { rerender } = render(modal({ mergeCandidates: [] }));
    expect(screen.getByText('🗑️ Remover e migrar').disabled).toBe(true);
    rerender(modal({ loading: true }));
    expect(screen.getByText('⏳ Removendo…').disabled).toBe(true);
    expect(screen.getByText('Cancelar').disabled).toBe(true);
  });

  it('cancel calls onClose', () => {
    const onClose = vi.fn();
    render(modal({ onClose }));
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
