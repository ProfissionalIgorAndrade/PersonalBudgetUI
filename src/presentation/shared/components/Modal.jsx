import React, { useState } from 'react';

/**
 * `size` aceita 'default' (540px), 'wide' (720px) e 'full' (96vw, até 1400px).
 * A prop `wide` continua valendo para quem já a usa.
 *
 * `confirmOnOverlay` protege modais com dados preenchidos. Clicar fora
 * fechava na hora, e um clique errado ao lado de um formulário longo
 * descartava tudo sem perguntar. Com a prop ligada, o clique fora pede
 * confirmação; o ✕ e o botão Cancelar continuam fechando direto, porque ali
 * a intenção é explícita.
 */
export default function Modal({
  title, onClose, children, wide, size,
  confirmOnOverlay = false,
  confirmMessage = 'Descartar o que você preencheu e fechar?',
}) {
  const [asking, setAsking] = useState(false);
  const cls = size === 'full' ? 'modal-full' : (size === 'wide' || wide) ? 'modal-wide' : '';

  const onOverlayClick = (e) => {
    if (e.target !== e.currentTarget) return;
    if (confirmOnOverlay) setAsking(true);
    else onClose();
  };

  return (
    <div className="modal-overlay" onClick={onOverlayClick}>
      <div className={`modal ${cls}`}>
        <div className="flex jcb aic" style={{ marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{title}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>

      {asking && (
        <div
          className="modal-overlay"
          style={{ zIndex: 60 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="modal" role="alertdialog" aria-label="Confirmar fechamento">
            <h2 className="modal-title" style={{ marginBottom: 10 }}>Fechar sem salvar?</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.5 }}>
              {confirmMessage}
            </p>
            <div className="flex jce gap2" style={{ gap: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setAsking(false)}>
                Continuar editando
              </button>
              <button type="button" className="btn btn-primary" onClick={() => { setAsking(false); onClose(); }}>
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
