import React from 'react';
import SavingsBoxCard from './SavingsBoxCard';

/**
 * "Minhas caixinhas": painel único à direita, como no layout original.
 *
 * A conta de origem deixa de ser um cabeçalho de seção e vira uma legenda no
 * card — agrupar por conta empurrava o resto da tela para baixo e espalhava
 * as caixinhas por linhas largas e quase vazias.
 */
export default function SavingsBoxPanel({ boxes, accountNameOf, onMove, onRename }) {
  return (
    <div className="card">
      <div className="flex jcb aic" style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Minhas caixinhas</h3>
        <span className="txxs tmuted">{boxes.length} ativa{boxes.length === 1 ? '' : 's'}</span>
      </div>

      {boxes.length === 0 ? (
        <p className="tmuted tsm" style={{ textAlign: 'center', padding: '14px 0' }}>
          Nenhuma caixinha ainda
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
          {boxes.map(b => (
            <SavingsBoxCard
              key={b.id}
              box={b}
              accountName={accountNameOf(b.parentAccountId)}
              onMove={dir => onMove(b, dir)}
              onRename={() => onRename(b)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
