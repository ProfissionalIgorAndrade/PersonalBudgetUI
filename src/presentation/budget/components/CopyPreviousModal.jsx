import React from 'react';
import { R$ } from '../../../core/utils/format';
import Modal from '../../shared/components/Modal';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * Confirmação de "Copiar mês anterior": mostra o que vai ser criado e o que
 * vai mudar de valor antes de gravar qualquer coisa no servidor.
 * `state`: { loading, plan, error, saving }.
 */
export default function CopyPreviousModal({ fromLabel, toLabel, state, onConfirm, onClose }) {
  const { loading, plan, error, saving } = state;
  const changes = plan ? plan.create.length + plan.update.length : 0;
  const close = saving ? () => {} : onClose;

  return (
    <Modal title="Copiar limites do mês anterior?" onClose={close}>
      <div className="bud-copy">
        {loading && <p className="bud-copy-text" role="status">Buscando os limites de {fromLabel}…</p>}

        {!loading && plan && changes === 0 && (
          <p className="bud-copy-text">
            {plan.same > 0
              ? `Os limites de ${toLabel} já são iguais aos de ${fromLabel}. Não há nada para copiar.`
              : `${fromLabel[0].toUpperCase()}${fromLabel.slice(1)} não tem limites para copiar.`}
          </p>
        )}

        {!loading && plan && changes > 0 && (
          <>
            <p className="bud-copy-text">
              Os limites de <strong>{fromLabel}</strong> serão salvos em <strong>{toLabel}</strong>:
            </p>
            <ul className="bud-copy-list">
              {plan.create.map(({ cat, limitAmount }) => (
                <li key={cat.id} className="bud-copy-item">
                  <span className="bud-copy-name"><span aria-hidden="true">{cat.icon || '📦'}</span> {cat.name}</span>
                  <span className="bud-copy-tag">novo</span>
                  <span className="bud-copy-value">{R$(limitAmount)}</span>
                </li>
              ))}
              {plan.update.map(({ cat, limitAmount, from }) => (
                <li key={cat.id} className="bud-copy-item">
                  <span className="bud-copy-name"><span aria-hidden="true">{cat.icon || '📦'}</span> {cat.name}</span>
                  <span className="bud-copy-tag bud-copy-tag-change">substitui {R$(from)}</span>
                  <span className="bud-copy-value">{R$(limitAmount)}</span>
                </li>
              ))}
            </ul>
            <p className="bud-copy-note">
              {[
                plan.create.length && plural(plan.create.length, 'limite novo', 'limites novos'),
                plan.update.length && plural(plan.update.length, 'limite substituído', 'limites substituídos'),
                plan.same && `${plural(plan.same, 'igual', 'iguais')} não ${plan.same === 1 ? 'muda' : 'mudam'}`,
              ].filter(Boolean).join(' · ')}. Limites que só {toLabel} tem continuam como estão.
            </p>
          </>
        )}

        {error && <p className="bud-copy-error" role="alert">{error}</p>}

        <div className="bud-copy-actions">
          <button type="button" className="btn btn-secondary" onClick={close} disabled={saving}>
            {changes > 0 ? 'Cancelar' : 'Fechar'}
          </button>
          {changes > 0 && (
            <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={saving || loading}>
              {saving ? 'Salvando…' : `Copiar ${plural(changes, 'limite', 'limites')}`}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
