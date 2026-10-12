import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import Sidebar from '../Sidebar';
import MobileTopBar from '../MobileTopBar';

afterEach(cleanup);

const renderSidebar = (props = {}) => render(
  <Sidebar view="dashboard" setView={() => {}} theme="dark" setTheme={() => {}} {...props} />);

describe('Sidebar as a mobile drawer', () => {
  it('is closed unless told otherwise', () => {
    const { container } = renderSidebar();
    expect(container.querySelector('.sidebar').classList.contains('open')).toBe(false);
  });

  it('marks itself open so the drawer slides in', () => {
    const { container } = renderSidebar({ open: true });
    expect(container.querySelector('.sidebar').classList.contains('open')).toBe(true);
  });

  it('navigates and closes the drawer when a destination is picked', () => {
    const setView = vi.fn();
    const onClose = vi.fn();
    renderSidebar({ setView, onClose, open: true });

    fireEvent.click(screen.getByText('Lançamentos'));

    expect(setView).toHaveBeenCalledWith('transactions');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes the drawer when opening the profile', () => {
    const setView = vi.fn();
    const onClose = vi.fn();
    renderSidebar({ setView, onClose, open: true, authSession: { displayName: 'Igor' } });

    fireEvent.click(screen.getByText('Igor'));

    expect(setView).toHaveBeenCalledWith('profile');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('still navigates without an onClose handler', () => {
    const setView = vi.fn();
    renderSidebar({ setView });
    fireEvent.click(screen.getByText('Cartões'));
    expect(setView).toHaveBeenCalledWith('cards');
  });
});

describe('MobileTopBar', () => {
  it('shows the current screen and offers to open the menu', () => {
    render(<MobileTopBar view="transactions" menuOpen={false} onToggleMenu={() => {}} />);
    expect(screen.getByText('Lançamentos')).toBeTruthy();
    expect(screen.getByLabelText('Abrir menu').getAttribute('aria-expanded')).toBe('false');
  });

  it('names the profile screen, which is not in the navigation list', () => {
    render(<MobileTopBar view="profile" menuOpen={false} onToggleMenu={() => {}} />);
    expect(screen.getByText('Meu Perfil')).toBeTruthy();
  });

  it('toggles the menu and reflects the open state', () => {
    const onToggleMenu = vi.fn();
    render(<MobileTopBar view="dashboard" menuOpen onToggleMenu={onToggleMenu} />);
    const button = screen.getByLabelText('Fechar menu');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(button);
    expect(onToggleMenu).toHaveBeenCalledTimes(1);
  });
});
