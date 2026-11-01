import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import React from 'react';
import HouseholdView from '../HouseholdView';

// O painel de convites tem testes próprios e falaria com a API.
vi.mock('../../members/components/InvitePanel', () => ({ default: () => null }));

afterEach(cleanup);

const members = [
  { id: 'm1', name: 'Igor', emoji: '🧔', color: '#2dd4bf', userId: 'u1' },
  { id: 'm2', name: 'Léo',  emoji: '👦', color: '#fbbf24' },
];
const categories = [
  { id: 'c1', name: 'Salário', type: 'income',  icon: '💵', color: '#50fa7b' },
  { id: 'c2', name: 'Mercado', type: 'expense', icon: '🛒', color: '#2dd4bf' },
  { id: 'c3', name: 'Saúde',   type: 'expense', icon: '💊', color: '#f87171' },
];

const baseProps = () => ({
  section: 'profile', onSection: vi.fn(),
  profile: { firstName: 'Igor', email: 'igor@exemplo.com' }, onProfileChange: vi.fn(),
  authSession: {}, notify: vi.fn(), onLogout: vi.fn(),
  members, mbrOps: { onAdd: vi.fn(), onEdit: vi.fn(), onDeleteProfile: vi.fn() },
  categories, catOps: { onAdd: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() },
});

const setup = (over = {}) => {
  const props = { ...baseProps(), ...over };
  const utils = render(<HouseholdView {...props} />);
  return { props, ...utils };
};

const nav = () => screen.getByRole('navigation', { name: 'Seções de Meu Lar' });
const link = (name) => within(nav()).getByRole('link', { name: new RegExp(`^${name}`) });
const panelOf = (name) => screen.getByRole('heading', { name, hidden: true }).closest('section');

describe('HouseholdView', () => {
  it('summarises each section in the sub-menu', () => {
    setup();
    const n = within(nav());
    expect(n.getByText('igor@exemplo.com')).toBeTruthy();
    expect(n.getAllByText('2 membros').length).toBeGreaterThan(0);
    expect(n.getByText('1 receita · 2 despesas')).toBeTruthy();
  });

  it('shows only the active section and marks it in the sub-menu', () => {
    setup({ section: 'family' });
    expect(panelOf('Família').hidden).toBe(false);
    expect(panelOf('Meu perfil').hidden).toBe(true);
    expect(link('Família').getAttribute('aria-current')).toBe('page');
  });

  it('switches section through its own address and moves focus to its title', () => {
    const { props, rerender } = setup();
    const target = link('Categorias');
    expect(target.getAttribute('href')).toBe('#household/categories');
    fireEvent.click(target);
    expect(props.onSection).toHaveBeenCalledWith('categories');
    rerender(<HouseholdView {...props} section="categories" />);
    expect(document.activeElement.id).toBe('hh-categories-title');
  });

  it('lets ctrl/cmd-click open the section in a new tab', () => {
    const { props } = setup();
    fireEvent.click(link('Família'), { ctrlKey: true });
    expect(props.onSection).not.toHaveBeenCalled();
  });

  it('keeps a half-done profile edit when switching sections', () => {
    const { props, rerender } = setup();
    fireEvent.click(screen.getByText('✏️ Editar perfil'));
    fireEvent.change(screen.getByPlaceholderText('Silva'), { target: { value: 'Andrade' } });
    rerender(<HouseholdView {...props} section="family" />);
    rerender(<HouseholdView {...props} section="profile" />);
    expect(screen.getByPlaceholderText('Silva').value).toBe('Andrade');
  });

  it('saves the profile through the app, so the sidebar sees the new name', () => {
    const { props } = setup();
    fireEvent.click(screen.getByText('✏️ Editar perfil'));
    fireEvent.change(screen.getByPlaceholderText('Silva'), { target: { value: 'Andrade' } });
    fireEvent.click(screen.getByText('💾 Salvar Perfil'));
    expect(props.onProfileChange).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Igor', lastName: 'Andrade' }));
    expect(props.notify).toHaveBeenCalledWith('Perfil salvo.', 'success');
  });
});
