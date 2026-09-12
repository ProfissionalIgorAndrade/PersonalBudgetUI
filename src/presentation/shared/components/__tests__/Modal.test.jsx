import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import Modal from '../Modal';

afterEach(cleanup);

const overlayOf = (container) => container.querySelector('.modal-overlay');

describe('Modal overlay click', () => {
  it('closes immediately when not protected', () => {
    const onClose = vi.fn();
    const { container } = render(<Modal title="X" onClose={onClose}><p>c</p></Modal>);
    fireEvent.click(overlayOf(container));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // The reported problem: one stray click beside a long form threw the
  // whole entry away with no warning.
  it('asks first when protected, and does not close yet', () => {
    const onClose = vi.fn();
    const { container } = render(<Modal title="X" onClose={onClose} confirmOnOverlay><p>c</p></Modal>);
    fireEvent.click(overlayOf(container));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Fechar sem salvar?')).toBeTruthy();
  });

  it('keeps the form open when the user chooses to continue', () => {
    const onClose = vi.fn();
    const { container } = render(<Modal title="X" onClose={onClose} confirmOnOverlay><p>c</p></Modal>);
    fireEvent.click(overlayOf(container));
    fireEvent.click(screen.getByText('Continuar editando'));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText('Fechar sem salvar?')).toBeNull();
  });

  it('closes once the user confirms', () => {
    const onClose = vi.fn();
    const { container } = render(<Modal title="X" onClose={onClose} confirmOnOverlay><p>c</p></Modal>);
    fireEvent.click(overlayOf(container));
    fireEvent.click(screen.getByText('Descartar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('leaves the ✕ button closing directly — that intent is explicit', () => {
    const onClose = vi.fn();
    render(<Modal title="X" onClose={onClose} confirmOnOverlay><p>c</p></Modal>);
    fireEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Fechar sem salvar?')).toBeNull();
  });

  it('does not close when the click starts inside the dialog', () => {
    const onClose = vi.fn();
    render(<Modal title="X" onClose={onClose}><p>conteudo</p></Modal>);
    fireEvent.click(screen.getByText('conteudo'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows a caller-supplied message', () => {
    const { container } = render(
      <Modal title="X" onClose={() => {}} confirmOnOverlay confirmMessage="Descartar a importação?">
        <p>c</p>
      </Modal>);
    fireEvent.click(overlayOf(container));
    expect(screen.getByText('Descartar a importação?')).toBeTruthy();
  });
});
