import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import MemberTile from '../MemberTile';

afterEach(cleanup);

const profile = { id: 'p1', name: 'Família', emoji: '👨👩👧👦', color: '#fb923c' };
const user    = { id: 'u1', name: 'Igor', emoji: '🧑', color: '#2dd4bf', userId: 'abc' };

describe('MemberTile', () => {
  it('injects the member color as the --mbr accent only', () => {
    const { container } = render(<MemberTile member={profile} />);
    expect(container.querySelector('.mbr-tile').style.getPropertyValue('--mbr')).toBe('#fb923c');
  });

  it('shows name, avatar and the role tag', () => {
    const { container, rerender } = render(<MemberTile member={profile} />);
    expect(screen.getByText('Família')).toBeTruthy();
    expect(container.querySelector('.mbr-avatar').textContent).toBe('👨👩👧👦');
    expect(screen.getByText('Perfil')).toBeTruthy();
    rerender(<MemberTile member={user} />);
    expect(screen.getByText('Usuário')).toBeTruthy();
  });

  it('turns the avatar into a pill with data-count for a family', () => {
    const { container } = render(<MemberTile member={profile} />);
    const av = container.querySelector('.mbr-avatar');
    expect(av.getAttribute('data-count')).toBe('4');
    expect(av.className).toContain('mbr-avatar-pill');
    expect(av.getAttribute('style')).toBeNull();
  });

  it('keeps the round chip for one person and for legacy ZWJ families', () => {
    const { container, rerender } = render(<MemberTile member={user} />);
    let av = container.querySelector('.mbr-avatar');
    expect(av.getAttribute('data-count')).toBe('1');
    expect(av.className).not.toContain('mbr-avatar-pill');
    rerender(<MemberTile member={{ ...profile, emoji: '👨‍👩‍👧‍👦' }} />);
    av = container.querySelector('.mbr-avatar');
    expect(av.getAttribute('data-count')).toBe('1');
    expect(av.className).not.toContain('mbr-avatar-pill');
  });

  it('renders no actions without handlers', () => {
    const { container } = render(<MemberTile member={profile} />);
    expect(container.querySelector('.mbr-actions')).toBeNull();
  });

  it('labels edit and delete with the member name and passes the member', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<MemberTile member={profile} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Editar Família'));
    fireEvent.click(screen.getByLabelText('Excluir Família'));
    expect(onEdit).toHaveBeenCalledWith(profile);
    expect(onDelete).toHaveBeenCalledWith(profile);
  });

  it('has no delete button for a linked user when no onDelete is given', () => {
    render(<MemberTile member={user} onEdit={() => {}} />);
    expect(screen.getByLabelText('Editar Igor')).toBeTruthy();
    expect(screen.queryByLabelText('Excluir Igor')).toBeNull();
  });
});
