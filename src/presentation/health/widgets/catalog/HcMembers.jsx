import React, { useState, useMemo } from 'react';
import { R$ } from '../../../../core/utils/format';
import { byMember } from '../../logic/catalog';
import { pct } from '../../logic/score';
import { HlCard, HlToggle, HlEmpty, HlRankBars } from '../HlParts';
import { HcTable } from './HcParts';

function MemberWidget({ id, title, subtitle, kind, emptyText, noun, transactions, members, month }) {
  const [mode, setMode] = useState('chart');
  const { total, items } = useMemo(() => byMember(transactions, members, month, kind), [transactions, members, month, kind]);

  const rows = items.map((m, i) => ({
    key: m.id || 'none', label: m.name, icon: m.emoji, value: m.value,
    valueText: `${R$(m.value)} · ${pct(m.share)}`,
    detail: `${m.name}: ${R$(m.value)}, ${pct(m.share)} ${noun}`,
    tone: i === 0 ? 'accent' : 'muted',
  }));

  return (
    <HlCard id={id} title={title} subtitle={subtitle}
      actions={<HlToggle value={mode} onChange={setMode} label={`${title}: exibição`} />}>
      {total <= 0 ? <HlEmpty>{emptyText}</HlEmpty> : mode === 'chart' ? (
        <HlRankBars rows={rows} ariaLabel={title} />
      ) : (
        <HcTable rowKey={r => r.id || 'none'} rows={items} columns={[
          { label: 'Membro', render: r => r.name },
          { label: 'Valor', render: r => R$(r.value) },
          { label: 'Participação', render: r => pct(r.share) },
        ]} footer={['Total', R$(total), '100%']} />
      )}
    </HlCard>
  );
}

/** Gasto por membro: despesa do mês por membro atribuído. */
export function HcMemberExpense(props) {
  return (
    <MemberWidget id="member-expense" title="Gasto por membro" kind="expense" noun="das despesas do mês"
      subtitle="Despesa do mês por membro. Lançamento sem membro aparece à parte."
      emptyText="Sem despesas neste mês." {...props} />
  );
}

/** Renda por membro: receita do mês por membro atribuído. */
export function HcMemberIncome(props) {
  return (
    <MemberWidget id="member-income" title="Renda por membro" kind="income" noun="da receita do mês"
      subtitle="Receita do mês por membro. Lançamento sem membro aparece à parte."
      emptyText="Sem receitas neste mês." {...props} />
  );
}
