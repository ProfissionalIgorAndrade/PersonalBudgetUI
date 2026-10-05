import React from 'react';
import Modal from '../shared/components/Modal';
import { CATALOG } from './layout';

const BY_ID = Object.fromEntries(CATALOG.map(w => [w.id, w]));

/**
 * Personalizador: liga/desliga e reordena só os widgets do catálogo. Os
 * obrigatórios não aparecem aqui. A ordem vale para a seção "Extras".
 */
export default function HealthCustomizer({ layout, onToggle, onMove, onReset, onClose }) {
  const enabled = layout.filter(w => w.on).length;
  return (
    <Modal title="Personalizar Saúde Financeira" onClose={onClose} wide>
      <p className="hl-note">
        Os 7 blocos principais ficam sempre visíveis, nesta ordem. Aqui você escolhe os widgets extras
        que aparecem abaixo deles e a ordem em que aparecem.
      </p>
      <ul className="hl-custom" aria-label="Widgets extras">
        {layout.map((entry, i) => {
          const w = BY_ID[entry.id];
          const checkId = `hl-custom-${w.id}`;
          return (
            <li key={w.id} className={`hl-custom-row${entry.on ? ' is-on' : ''}`}>
              <input id={checkId} type="checkbox" checked={entry.on} onChange={() => onToggle(w.id)} />
              <label htmlFor={checkId} className="hl-custom-text">
                <span className="hl-custom-title">{w.title}</span>
                <span className="hl-custom-desc">{w.group} · {w.description}</span>
              </label>
              <span className="hl-custom-move">
                <button type="button" className="btn-icon" aria-label={`Subir ${w.title}`}
                  disabled={i === 0} onClick={() => onMove(w.id, -1)}>↑</button>
                <button type="button" className="btn-icon" aria-label={`Descer ${w.title}`}
                  disabled={i === layout.length - 1} onClick={() => onMove(w.id, 1)}>↓</button>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="hl-custom-foot">
        <span className="hl-note" aria-live="polite">{enabled} de {layout.length} ligados</span>
        <span>
          <button type="button" className="btn btn-secondary" onClick={onReset}>Desligar todos</button>{' '}
          <button type="button" className="btn btn-primary" onClick={onClose}>Concluir</button>
        </span>
      </div>
    </Modal>
  );
}
