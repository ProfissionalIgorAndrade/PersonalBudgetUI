import React from 'react';
import { HlEmpty } from '../../health/widgets/HlParts';
import { countPeople } from '../../../core/constants/avatars';
import {
  MODE_LABEL, TYPE_LABEL, TYPE_ICON, signedMoney, simulationSummary, installmentTotalText, ownerInfo,
} from '../logic/labels';

const WARNING_TITLE = {
  BeforeWindow: 'Termina antes do período',
  Truncated: 'Começa antes do período',
  AfterWindow: 'Continua após o período',
};

function OwnerLine({ owner }) {
  const group = owner.emoji && countPeople(owner.emoji) > 1;
  return (
    <p className="wi-sc-owner">
      <span
        className={group ? 'wi-sc-avatar is-group' : 'wi-sc-avatar'}
        style={owner.color ? { '--mbr': owner.color } : undefined} aria-hidden="true"
      >{owner.emoji || '👤'}</span>
      <span className="wi-sc-owner-text">{owner.text}</span>
    </p>
  );
}

function SimulationCard({ info, projection, warnings, members, saving, onToggle, onEdit, onRemove }) {
  const { sim, name, slot } = info;
  const total = installmentTotalText(sim);
  const owner = ownerInfo(sim, members);
  const createdBy = `Criada por ${owner.name}`;
  return (
    <li className={`wi-sc wi-cat-${slot}${sim.enabled ? '' : ' is-off'}`}>
      <div className="wi-sc-head">
        <span className="wi-sc-dot" aria-hidden="true" />
        <strong className="wi-sc-name">{name}</strong>
        <div className="wi-sc-actions">
          {sim.isOwner ? (
            <>
              <button type="button" className="btn-icon" aria-label={`Editar ${name}`} title="Editar" disabled={saving} onClick={() => onEdit(sim)}>✏️</button>
              <button type="button" className="btn-icon" aria-label={`Remover ${name}`} title="Remover" disabled={saving} onClick={() => onRemove(sim.id)}>🗑️</button>
            </>
          ) : (
            <span className="wi-sc-lock" role="img" aria-label={createdBy} title={createdBy}>🔒</span>
          )}
        </div>
      </div>
      <OwnerLine owner={owner} />

      <p className="wi-sc-tag">
        <span aria-hidden="true">{TYPE_ICON[sim.type]} </span>{TYPE_LABEL[sim.type]} · {MODE_LABEL[sim.mode]}
      </p>
      <p className="wi-sc-summary">{simulationSummary(sim)}</p>
      {total && <p className="wi-sc-detail">{total}</p>}
      {projection && (
        <p className="wi-sc-detail">No período: <strong>{signedMoney(projection.totalInHorizon)}</strong></p>
      )}

      {warnings.map((w, i) => (
        <p key={`${w.code}${i}`} className="wi-warn">
          <span aria-hidden="true">⚠ </span><strong>{WARNING_TITLE[w.code] ?? 'Atenção'}.</strong> {w.message}
        </p>
      ))}

      <button
        type="button" role="switch" aria-checked={sim.enabled} className="wi-switch wi-sc-switch"
        aria-label={`${sim.enabled ? 'Desligar' : 'Ligar'} ${name}`} onClick={() => onToggle(sim.id)}
      >
        <span className="wi-switch-knob" aria-hidden="true" />
        <span className="wi-switch-text">{sim.enabled ? 'Ligada' : 'Desligada'}</span>
      </button>
    </li>
  );
}

/**
 * Cartões compactos das simulações (de toda a família), com o dono, liga/desliga,
 * editar e remover (só para o dono) e os avisos da janela no cartão certo. `infos`: [{ sim, name, slot }].
 */
export default function SimulationStrip({
  infos, scheduleById, warnings, limitReached, members = [], saving = false, onToggle, onEdit, onRemove, onAdd,
}) {
  if (infos.length === 0) {
    return (
      <div className="wi-sc-empty">
        <HlEmpty>Nenhuma simulação ainda. Adicione uma compra parcelada, uma renda extra ou um gasto mensal para ver o que muda em cada mês.</HlEmpty>
        <button type="button" className="btn btn-primary" onClick={onAdd} disabled={limitReached || saving}>+ Nova simulação</button>
      </div>
    );
  }
  return (
    <>
      <ul className="wi-sc-list" aria-label="Simulações">
        {infos.map((info) => (
          <SimulationCard
            key={info.sim.id} info={info} projection={scheduleById.get(info.sim.id)}
            warnings={warnings.filter((w) => w.impactId === info.sim.id)}
            members={members} saving={saving}
            onToggle={onToggle} onEdit={onEdit} onRemove={onRemove}
          />
        ))}
      </ul>
      {limitReached && <p className="wi-hint" role="status">Limite de 50 simulações atingido.</p>}
    </>
  );
}
