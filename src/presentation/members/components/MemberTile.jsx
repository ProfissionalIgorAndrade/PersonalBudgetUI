import React from 'react';
import { countPeople } from '../../../core/constants/avatars';

/**
 * A cor do membro entra só como acento (`--mbr`): o chip do avatar é uma
 * mistura translúcida dela com a superfície do tema e o anel usa a cor
 * cheia. Texto, fundo e borda vêm dos tokens do tema, então o tile fica
 * legível no claro e no escuro sem calcular contraste.
 *
 * `onDelete` só vem preenchido para quem pode ser excluído (perfis, com mais
 * de um perfil no lar); usuários com login nunca recebem o botão.
 */
export default function MemberTile({ member, onEdit, onDelete }) {
  const linked = member.userId != null && member.userId !== '';
  const count  = countPeople(member.emoji);

  return (
    <div className="mbr-tile" style={{ '--mbr': member.color }}>
      <div
        className={count > 1 ? 'mbr-avatar mbr-avatar-pill' : 'mbr-avatar'}
        data-count={Math.min(count, 4) || 1}
        aria-hidden="true"
      >{member.emoji}</div>
      <div className="mbr-info">
        <span className="mbr-name" title={member.name}>{member.name}</span>
        <span className="mbr-tag">{linked ? 'Usuário' : 'Perfil'}</span>
      </div>
      {(onEdit || onDelete) && (
        <div className="mbr-actions">
          {onEdit && (
            <button type="button" className="btn-icon" style={{ padding: '4px 7px', fontSize: 12 }}
              title="Editar" aria-label={`Editar ${member.name}`} onClick={() => onEdit(member)}>✏️</button>
          )}
          {onDelete && (
            <button type="button" className="btn-icon" style={{ padding: '4px 7px', fontSize: 12 }}
              title="Excluir" aria-label={`Excluir ${member.name}`} onClick={() => onDelete(member)}>🗑️</button>
          )}
        </div>
      )}
    </div>
  );
}
