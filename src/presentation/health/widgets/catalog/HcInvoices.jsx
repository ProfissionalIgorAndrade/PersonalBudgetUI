import React, { useState, useEffect, useMemo } from 'react';
import { R$ } from '../../../../core/utils/format';
import * as cardRepository from '../../../../data/repositories/cardRepository';
import { statementTotal, cardUsage } from '../../logic/catalog';
import { pct } from '../../logic/score';
import { CARD_USAGE_WARN } from '../../logic/targets';
import { HlCard, HlToggle, HlEmpty, HlStatus } from '../HlParts';
import { HcTable } from './HcParts';

const USAGE_LABEL = { good: 'Dentro do ideal', warning: 'Atenção', critical: 'Alto', unknown: 'Sem limite' };

/**
 * Faturas do mês de cada cartão (via getStatement) e quanto do limite elas
 * ocupam. Estado local: não toca no estado global do app. Cada mudança de
 * mês/cartões cancela a rodada anterior, então uma resposta atrasada de um mês
 * antigo nunca sobrescreve o mês atual. 404 ou erro vira "sem fatura".
 */
function useStatements(cards, month) {
  const [state, setState] = useState({ key: '', byCard: {} });
  const ids = (cards || []).map(c => c.id).join('|');
  const key = `${month}#${ids}`;

  useEffect(() => {
    let cancelled = false;
    const list = cards || [];
    const [year, mon] = String(month).split('-').map(Number);
    setState({ key, byCard: Object.fromEntries(list.map(c => [c.id, { status: 'loading' }])) });
    list.forEach(card => {
      Promise.resolve()
        .then(() => cardRepository.getStatement(card.id, mon, year))
        .then(payload => {
          const total = statementTotal(payload);
          return total === null ? { status: 'none' } : { status: 'ok', total };
        })
        .catch(() => ({ status: 'none' }))
        .then(result => {
          if (cancelled) return;
          setState(s => (s.key === key ? { key, byCard: { ...s.byCard, [card.id]: result } } : s));
        });
    });
    return () => { cancelled = true; };
  }, [key]);

  // Antes do efeito rodar para um novo mês, o estado ainda é do mês anterior: trata como carregando.
  return state.key === key ? state.byCard : Object.fromEntries((cards || []).map(c => [c.id, { status: 'loading' }]));
}

export default function HcInvoices({ cards, month }) {
  const [mode, setMode] = useState('chart');
  const list = useMemo(() => cards || [], [cards]);
  const byCard = useStatements(list, month);

  const rows = list.map(card => {
    const s = byCard[card.id] || { status: 'loading' };
    const usage = s.status === 'ok' ? cardUsage(s.total, card.limit) : null;
    return { card, status: s.status, total: s.total, usage };
  });
  const loaded = rows.filter(r => r.status === 'ok');
  const sumTotal = loaded.reduce((a, r) => a + r.total, 0);
  const sumLimit = loaded.reduce((a, r) => a + (r.usage.limit > 0 ? r.usage.limit : 0), 0);
  const sumUsed = loaded.reduce((a, r) => a + (r.usage.limit > 0 ? r.usage.used : 0), 0);
  const anyLoading = rows.some(r => r.status === 'loading');

  const totalText = (r) => (r.status === 'loading' ? 'carregando…' : r.status === 'none' ? 'sem fatura' : R$(r.total));
  const usageText = (r) => (r.usage && r.usage.pct !== null ? pct(r.usage.pct) : '—');

  return (
    <HlCard id="invoices" title="Faturas e uso do limite"
      subtitle={`Fatura do mês de cada cartão contra o limite cadastrado. Acima de ${Math.round(CARD_USAGE_WARN * 100)}% do limite é atenção. O uso conta só a fatura do mês, não parcelas futuras.`}
      actions={list.length > 0 ? <HlToggle value={mode} onChange={setMode} label="Faturas: exibição" /> : null}>
      {list.length === 0 ? <HlEmpty>Nenhum cartão cadastrado.</HlEmpty> : mode === 'chart' ? (
        <>
          <ul className="hl-invoices" aria-busy={anyLoading}>
            {rows.map(r => (
              <li key={r.card.id} className="hl-invoice" tabIndex={0}
                aria-label={`${r.card.name}: ${totalText(r)}${r.usage && r.usage.pct !== null ? `, ${usageText(r)} do limite de ${R$(r.usage.limit)}` : ''}`}>
                <div className="hl-goal-head">
                  <span>{r.card.name}</span>
                  <strong>{totalText(r)}{r.usage && r.usage.limit > 0 && <span className="hl-goal-of"> de {R$(r.usage.limit)}</span>}</strong>
                </div>
                {r.usage && r.usage.pct !== null && (
                  <>
                    <div className={`hl-meter hl-${r.usage.level}`} role="meter" aria-label={`Uso do limite ${r.card.name}`}
                      aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(r.usage.pct, 1) * 100)}
                      aria-valuetext={`${usageText(r)} do limite`}>
                      <span className="hl-meter-fill" style={{ width: `${Math.max(Math.min(r.usage.pct, 1) * 100, 2)}%` }} />
                    </div>
                    <HlStatus level={r.usage.level} label={`${usageText(r)} do limite · ${USAGE_LABEL[r.usage.level]}`} />
                  </>
                )}
                {r.status === 'ok' && r.usage.pct === null && <span className="hl-goal-note">Cartão sem limite cadastrado.</span>}
              </li>
            ))}
          </ul>
          {loaded.length > 0 && (
            <p className="hl-callout hl-callout-neutral">
              Total das faturas: <strong>{R$(sumTotal)}</strong>
              {sumLimit > 0 && <> · uso do limite somado: <strong>{pct(sumUsed / sumLimit)}</strong></>}
            </p>
          )}
        </>
      ) : (
        <HcTable rowKey={r => r.card.id} rows={rows} columns={[
          { label: 'Cartão', render: r => r.card.name },
          { label: 'Fatura', render: totalText },
          { label: 'Limite', render: r => (Number(r.card.limit) > 0 ? R$(r.card.limit) : '—') },
          { label: 'Uso', render: r => (r.usage ? `${usageText(r)} · ${USAGE_LABEL[r.usage.level]}` : '—') },
        ]} />
      )}
    </HlCard>
  );
}
