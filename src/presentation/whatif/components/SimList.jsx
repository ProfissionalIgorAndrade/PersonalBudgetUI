import React from 'react';
import { signedMoney, simulationSummary } from '../../simulator/logic/labels';
import { simColor } from '../logic/chartKit';

/**
 * Rostinho de quem criou a simulação: o emoji do membro sobre a cor dele. O
 * nome não aparece escrito, só no title e para leitores de tela.
 */
export function Avatar({ owner, size = 32 }) {
  const label = `Criada por ${owner.name}`;
  return (
    <span
      className="wf-avatar" style={{ '--mbr': owner.color || 'var(--text-2)', '--size': `${size}px` }}
      title={label} role="img" aria-label={label}
    >
      {owner.emoji || owner.name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

export function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * As simulações da família, uma por cartão: rostinho de quem criou, nome, quando
 * cai, o efeito no período e o switch que liga ou desliga (só para quem está
 * vendo). O último cartão cria uma nova. `compact` empilha em uma coluna, para a
 * lateral da visão por mês.
 */
export default function SimList({
  rows, onToggle, onEdit, onSetAll, onCreate, saving, limitReached, ownedCount, onClearMine,
  compact = false, hoverId = null, onHover = () => {},
}) {
  const saved = rows.filter((r) => r.id !== '__draft');
  const onCount = saved.filter((r) => r.sim.enabled).length;

  return (
    <section className={`wf-panel wf-sims${compact ? ' is-compact' : ''}`} aria-labelledby="wf-sims-title">
      <header className="wf-sims-bar">
        <div className="wf-sims-heading">
          <h2 className="wf-h2" id="wf-sims-title">Simulações</h2>
          {saved.length > 0 && (
            <span className="wf-sims-count">
              <strong className="wf-num">{onCount}</strong> de {saved.length} {saved.length === 1 ? 'ligada' : 'ligadas'}
            </span>
          )}
        </div>
        {saved.length > 1 && (
          <span className="wf-sims-bulk">
            <button type="button" className="wf-link" onClick={() => onSetAll(true)} disabled={onCount === saved.length}>Ligar todas</button>
            <button type="button" className="wf-link" onClick={() => onSetAll(false)} disabled={onCount === 0}>Desligar todas</button>
          </span>
        )}
      </header>

      <ul className="wf-cards" onMouseLeave={() => onHover(null)}>
        {rows.map((row) => (
          <SimCard
            key={row.id} row={row} saving={saving} onToggle={onToggle} onEdit={onEdit}
            dimmed={hoverId !== null && hoverId !== row.id} onHover={onHover}
          />
        ))}
        <li>
          {limitReached ? (
            <p className="wf-card-new is-full">Limite de 50 simulações. Remova alguma para criar outra.</p>
          ) : (
            <button type="button" className="wf-card-new" onClick={onCreate} disabled={saving}>
              <span className="wf-card-new-icon"><PlusIcon /></span>
              {saved.length === 0 ? 'Criar a primeira simulação' : 'Nova simulação'}
            </button>
          )}
        </li>
      </ul>

      {ownedCount > 0 && (
        <footer className="wf-sims-foot">
          <button type="button" className="wf-link wf-link-danger" onClick={onClearMine} disabled={saving}>
            Remover minhas simulações
          </button>
        </footer>
      )}
    </section>
  );
}

function SimCard({ row, saving, onToggle, onEdit, dimmed, onHover }) {
  const { sim, name, owner, total, isDraft } = row;
  const editable = sim.isOwner && !isDraft;
  const kind = sim.type === 'Income' ? 'is-income' : 'is-expense';
  const cls = ['wf-card', kind, sim.enabled ? '' : 'is-off', isDraft ? 'is-draft' : '', dimmed ? 'is-dimmed' : '']
    .filter(Boolean).join(' ');

  return (
    <li className={cls} onMouseEnter={() => onHover(row.id)}>
      <Avatar owner={owner} />
      <div className="wf-card-text">
        {editable ? (
          <button type="button" className="wf-card-name" onClick={() => onEdit(sim)} disabled={saving} title={`Editar ${name}`}>
            {name}
          </button>
        ) : (
          <span className="wf-card-name is-static" title={name}>{name}</span>
        )}
        <span className="wf-card-when">{simulationSummary(sim)}</span>
      </div>

      {isDraft ? (
        <span className="wf-card-draft">Rascunho</span>
      ) : (
        <button
          type="button" role="switch" aria-checked={sim.enabled} className="wf-switch"
          aria-label={`${name}: ${sim.enabled ? 'ligada, entra na conta' : 'desligada, fora da conta'}`}
          title={sim.enabled ? 'Entra na conta. Clique para desligar.' : 'Fora da conta. Clique para ligar.'}
          onClick={() => onToggle(sim.id)}
        >
          <span className="wf-switch-thumb" aria-hidden="true" />
        </button>
      )}

      <p className="wf-card-impact">
        {/* A cor da simulação nos gráficos; desligada, só o contorno. */}
        <span className="wf-card-key" style={{ '--c': simColor(row.slot) }} aria-hidden="true" />
        <span className="wf-card-amount wf-num">{signedMoney(total)}</span>
        <span className="wf-card-period">{sim.enabled || isDraft ? 'no período' : 'fora da conta'}</span>
      </p>
    </li>
  );
}
