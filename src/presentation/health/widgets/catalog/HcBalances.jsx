import React, { useState, useMemo } from 'react';
import { R$ } from '../../../../core/utils/format';
import { accountBalances } from '../../logic/catalog';
import { HlCard, HlToggle, HlEmpty, HlRankBars } from '../HlParts';
import { HcTable } from './HcParts';

/** Saldo das contas correntes (caixinhas ficam em "Caixinhas e metas"). */
export default function HcBalances({ accounts }) {
  const [mode, setMode] = useState('chart');
  const { total, items } = useMemo(() => accountBalances(accounts), [accounts]);

  const rows = items.map((a, i) => ({
    key: a.id, label: a.name, icon: a.balance < 0 ? '✕' : '🏦', value: Math.max(a.balance, 0),
    valueText: `${a.balance < 0 ? 'negativo ' : ''}${R$(a.balance)}`,
    detail: `${a.name}: ${R$(a.balance)}${a.balance < 0 ? ' (saldo negativo)' : ''}`,
    tone: i === 0 ? 'accent' : 'muted',
  }));

  return (
    <HlCard id="balances" title="Saldo das contas" subtitle="Saldo atual de cada conta corrente ativa, sem as caixinhas."
      actions={<HlToggle value={mode} onChange={setMode} label="Saldo das contas: exibição" />}>
      {items.length === 0 ? <HlEmpty>Nenhuma conta corrente cadastrada.</HlEmpty> : (
        <>
          <p className="hl-note">Saldo total: <strong>{R$(total)}</strong></p>
          {mode === 'chart'
            ? <HlRankBars rows={rows} ariaLabel="Saldo por conta corrente" />
            : <HcTable rowKey={r => r.id} rows={items} columns={[
              { label: 'Conta', render: r => r.name },
              { label: 'Saldo', render: r => R$(r.balance) },
            ]} footer={['Total', R$(total)]} />}
        </>
      )}
    </HlCard>
  );
}
