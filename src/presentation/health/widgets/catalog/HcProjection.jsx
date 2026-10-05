import React, { useState, useMemo } from 'react';
import { R$, monthLabel } from '../../../../core/utils/format';
import { balanceProjection } from '../../logic/catalog';
import { BASELINE_MONTHS, PROJECTION_MONTHS } from '../../logic/targets';
import { HlCard, HlToggle, HlEmpty, HlEvoChart, compact } from '../HlParts';
import { HcTable } from './HcParts';

/**
 * Projeção de saldo: saldo atual das contas correntes + (renda média - fixos e
 * parcelas já lançados) acumulado mês a mês. A premissa fica visível na tela.
 */
export default function HcProjection({ transactions, accounts, month }) {
  const [mode, setMode] = useState('chart');
  const proj = useMemo(() => balanceProjection(transactions, accounts, month), [transactions, accounts, month]);

  const points = proj.state === 'ok'
    ? [{ key: 'hoje', label: 'Hoje', value: proj.start }, ...proj.months.map(m => ({ key: m.key, label: monthLabel(m.key).split('/')[0], value: m.balance }))]
    : [];

  return (
    <HlCard id="projection" title={`Projeção de saldo (${PROJECTION_MONTHS} meses)`}
      subtitle="Quanto as contas correntes teriam se a renda média se repetir e só os compromissos já lançados forem pagos."
      actions={proj.state === 'ok' ? <HlToggle value={mode} onChange={setMode} label="Projeção: exibição" /> : null}>
      {proj.state === 'no-accounts' && <HlEmpty>Nenhuma conta corrente ativa para partir o saldo.</HlEmpty>}
      {proj.state === 'no-income' && <HlEmpty>Sem renda nos últimos {BASELINE_MONTHS} meses: não há renda média para projetar.</HlEmpty>}
      {proj.state === 'ok' && (
        <>
          <p className="hl-callout hl-callout-neutral">
            Premissa: saldo de hoje das contas correntes ({R$(proj.start)}) + renda média dos últimos {BASELINE_MONTHS} meses
            ({R$(proj.income)}) − fixos e parcelas já lançados em cada mês. Não desconta gastos variáveis nem prevê mudança de renda.
          </p>
          {proj.negativeAt && (
            <p className="hl-note"><span aria-hidden="true">✕ </span>O saldo projetado fica negativo em <strong>{monthLabel(proj.negativeAt)}</strong>.</p>
          )}
          {mode === 'chart' ? (
            <HlEvoChart kind="columns" title="Saldo projetado (R$)" points={points} format={R$} axisFormat={compact}
              ariaLabel="Saldo projetado por mês" />
          ) : (
            <HcTable rowKey={m => m.key} rows={proj.months} columns={[
              { label: 'Mês', render: m => monthLabel(m.key) },
              { label: 'Compromissos', render: m => R$(m.commitments) },
              { label: 'Resultado do mês', render: m => R$(m.delta) },
              { label: 'Saldo', render: m => R$(m.balance) },
            ]} />
          )}
        </>
      )}
    </HlCard>
  );
}
