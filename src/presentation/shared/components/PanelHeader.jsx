import React, { forwardRef } from 'react';

/**
 * Cabeçalho de uma seção dentro de uma tela com sub-menu (Meu Lar): o título
 * é um h2 (o h1 é o da tela) e recebe foco quando a seção é aberta pelo
 * sub-menu, para quem navega por teclado ou leitor de tela cair no conteúdo.
 */
const PanelHeader = forwardRef(function PanelHeader({ id, title, sub, children }, ref) {
  return (
    <header className="hh-panel-head">
      <div className="hh-panel-heading">
        <h2 id={id} ref={ref} tabIndex={-1} className="hh-panel-title">{title}</h2>
        {sub && <p className="hh-panel-sub">{sub}</p>}
      </div>
      {children && <div className="hh-panel-actions">{children}</div>}
    </header>
  );
});

export default PanelHeader;
