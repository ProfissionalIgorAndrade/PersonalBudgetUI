import React, { useRef } from 'react';

/**
 * Abas acessíveis (padrão WAI-ARIA tabs com ativação automática):
 * setas esquerda/direita movem e ativam, Home/End vão às pontas, e só a aba
 * ativa está na ordem de tabulação.
 *
 * tabs: [{ id, label }]. O painel é renderizado por quem usa, com
 * `id={`${idBase}-panel-${id}`}` e `aria-labelledby={`${idBase}-tab-${id}`}`.
 */
export const tabId = (base, id) => `${base}-tab-${id}`;
export const panelId = (base, id) => `${base}-panel-${id}`;

export default function WiTabs({ idBase, tabs, value, onChange, label }) {
  const refs = useRef({});

  const move = (index) => {
    const next = tabs[(index + tabs.length) % tabs.length];
    onChange(next.id);
    const el = refs.current[next.id];
    if (el) el.focus();
  };

  const onKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); move(index + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); move(index - 1); }
    else if (e.key === 'Home') { e.preventDefault(); move(0); }
    else if (e.key === 'End') { e.preventDefault(); move(tabs.length - 1); }
  };

  return (
    <div className="wi-tabs" role="tablist" aria-label={label}>
      {tabs.map((t, i) => (
        <button
          key={t.id} type="button" role="tab" id={tabId(idBase, t.id)}
          ref={(el) => { refs.current[t.id] = el; }}
          aria-selected={value === t.id} aria-controls={panelId(idBase, t.id)}
          tabIndex={value === t.id ? 0 : -1}
          className={`wi-tab${value === t.id ? ' is-active' : ''}`}
          onClick={() => onChange(t.id)} onKeyDown={(e) => onKeyDown(e, i)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
