import React from 'react';
import InviteList from './InviteList';
import { sentTitle, sentHint } from '../logic/invites';

export default function SentInvites({ state }) {
  return (
    <InviteList title="Convites enviados (pendentes)" state={state} emptyText="Nenhum convite pendente enviado.">
      {state.items.map((inv, i) => {
        const hint = sentHint(inv);
        return (
          <li key={inv.id ?? inv.inviteId ?? inv.token ?? i} className="mbr-invite-item">
            <div style={{ minWidth: 0 }}>
              <div className="mbr-invite-title">{sentTitle(inv)}</div>
              {hint && <div className="mbr-invite-hint">{hint}</div>}
            </div>
          </li>
        );
      })}
    </InviteList>
  );
}
