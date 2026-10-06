import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import MemberForm from '../MemberForm';

afterEach(cleanup);

const base = { name: 'Ana', emoji: '👩', color: '#2dd4bf' };
const form = (f = base, over = {}) => (
  <MemberForm f={f} onChange={() => {}} onSave={() => {}} onClose={() => {}} {...over} />
);

describe('MemberForm', () => {
  it('disables Save while the name is blank', () => {
    render(form({ ...base, name: '   ' }));
    expect(screen.getByText('💾 Salvar').disabled).toBe(true);
  });

  it('shows the alert only after the name field loses focus empty', () => {
    render(form({ ...base, name: '' }));
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.blur(screen.getByLabelText('Nome'));
    expect(screen.getByRole('alert').textContent).toMatch(/Informe um nome/);
  });

  it('saves when the name is filled', () => {
    const onSave = vi.fn();
    render(form(base, { onSave }));
    fireEvent.click(screen.getByText('💾 Salvar'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('previews the typed name, avatar and color', () => {
    render(form({ name: ' Ana ', emoji: '👵', color: '#fb923c' }));
    const tile = screen.getByLabelText('Prévia do membro').querySelector('.mbr-tile');
    expect(tile.textContent).toContain('Ana');
    expect(tile.textContent).toContain('👵');
    expect(tile.style.getPropertyValue('--mbr')).toBe('#fb923c');
  });

  it('previews a placeholder name while empty', () => {
    render(form({ ...base, name: '' }));
    expect(screen.getByLabelText('Prévia do membro').textContent).toContain('Nome do membro');
  });

  it('has no Tipo field', () => {
    render(form());
    expect(screen.queryByText('Tipo')).toBeNull();
  });

  it('groups avatars and marks the selected one with aria-pressed', () => {
    render(form());
    ['Adultos', 'Idosos', 'Crianças', 'Famílias'].forEach(g => expect(screen.getByRole('group', { name: g })).toBeTruthy());
    expect(screen.getByLabelText('Avatar 👩').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Avatar 👨').getAttribute('aria-pressed')).toBe('false');
  });

  it('selecting an avatar keeps the current skin tone', () => {
    const onChange = vi.fn();
    render(form({ ...base, emoji: '👩\u{1F3FD}' }, { onChange }));
    fireEvent.click(screen.getByLabelText('Avatar 👵'));
    expect(onChange.mock.calls[0][0].emoji).toBe('👵\u{1F3FD}');
  });

  it('selecting a family avatar keeps the tone on every person', () => {
    const onChange = vi.fn();
    render(form({ ...base, emoji: '👩\u{1F3FD}' }, { onChange }));
    fireEvent.click(screen.getByLabelText('Avatar 👨👩👧'));
    expect(onChange.mock.calls[0][0].emoji).toBe('👨🏽👩🏽👧🏽');
  });

  it('family picker buttons use the wide class, person buttons do not', () => {
    render(form());
    expect(screen.getByLabelText('Avatar 👨👩👧👦').className).toContain('mbr-opt-wide');
    expect(screen.getByLabelText('Avatar 👩').className).not.toContain('mbr-opt-wide');
  });

  it('shows the tone selector for a composed family and applies it to the whole group', () => {
    const onChange = vi.fn();
    render(form({ ...base, emoji: '👨👩👧👦' }, { onChange }));
    expect(screen.getByRole('group', { name: 'Tom de pele' }).querySelectorAll('button').length).toBe(6);
    fireEvent.click(screen.getByLabelText('Tom Médio'));
    expect(onChange.mock.calls[0][0].emoji).toBe('👨🏽👩🏽👧🏽👦🏽');
  });

  it('changing the tone of an already toned family re-applies it to all people', () => {
    const onChange = vi.fn();
    render(form({ ...base, emoji: '👨🏻👩🏻' }, { onChange }));
    fireEvent.click(screen.getByLabelText('Tom Escuro'));
    expect(onChange.mock.calls[0][0].emoji).toBe('👨🏿👩🏿');
  });

  it('offers the six tone options only for a person base and applies them', () => {
    const onChange = vi.fn();
    render(form(base, { onChange }));
    const group = screen.getByRole('group', { name: 'Tom de pele' });
    expect(group.querySelectorAll('button').length).toBe(6);
    fireEvent.click(screen.getByLabelText('Tom Escuro'));
    expect(onChange.mock.calls[0][0].emoji).toBe('👩\u{1F3FF}');
  });

  it('hides the tone control for legacy ZWJ family and non-person emoji', () => {
    const { rerender } = render(form({ ...base, emoji: '👨‍👩‍👧‍👦' }));
    expect(screen.queryByRole('group', { name: 'Tom de pele' })).toBeNull();
    rerender(form({ ...base, emoji: '💼' }));
    expect(screen.queryByRole('group', { name: 'Tom de pele' })).toBeNull();
  });
});
