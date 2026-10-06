import React from 'react';
import InviteList from './InviteList';
import { receivedTitle, receivedHint, receivedInviteToken } from '../logic/invites';

export default function ReceivedInvites({ state, acceptingToken, disabled, onAccept }) {
  return (
    <InviteList title="Convites recebidos" state={state} emptyText="Nenhum convite recebido.">
      {state.items.map((inv, i) => {
        const title = receivedTitle(inv);
        const hint  = receivedHint(inv);
        const tok   = receivedInviteToken(inv);
        const busy  = acceptingToken === tok;
        return (
          <li key={inv.id ?? tok ?? inv.inviteId ?? i} className="mbr-invite-item">
            <div style={{ minWidth: 0 }}>
              <div className="mbr-invite-title">{title}</div>
              {hint && <div className="mbr-invite-hint">{hint}</div>}
              {!tok && <div className="mbr-invite-hint" style={{ color: 'var(--yellow)' }}>Sem token no convite</div>}
            </div>
            {tok && (
              <button
                type="button"
                className="btn-icon"
                title="Aceitar convite"
                aria-label={`Aceitar convite de ${title}`}
                disabled={!!acceptingToken || disabled}
                onClick={() => onAccept(tok)}
                style={{ flexShrink: 0, fontSize: 18 }}
              >{busy ? '⏳' : '✅'}</button>
            )}
          </li>
        );
      })}
    </InviteList>
  );
}
