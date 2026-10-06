import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { R$, curMonth } from '../../../core/utils/format';
import { statementNet, statementRows } from '../../../core/utils/billing';
import { normalizeTransaction } from '../../../application/mappers';
import TxTable from '../../transactions/components/TxTable';
import * as cardRepo from '../../../data/repositories/cardRepository';

const NUM = { fontFamily: "'Inter', sans-serif", fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1' };

/** Merge nested DTOs common in ASP.NET responses (statement + root envelope). */
function unwrapStatementPayload(raw) {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return raw || {};
  const nestKeys = ['statement', 'Statement', 'creditCardStatement', 'CreditCardStatement', 'detail', 'Detail'];
  for (const k of nestKeys) {
    const inner = raw[k];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      return { ...raw, ...inner };
    }
  }
  return raw;
}

/** Transactions embedded in GetStatement response (ASP.NET casing / nesting tolerant). */
function extractStatementTransactions(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'object') return [];

  const tryLists = (...cands) => {
    for (const c of cands) if (Array.isArray(c) && c.length) return c;
    return [];
  };

  const direct = tryLists(raw.transactions, raw.Transactions);
  if (direct.length) return direct;

  const flat = unwrapStatementPayload(raw);
  const fromFlat = tryLists(
    flat.transactions, flat.Transactions,
    flat.transactionDtos, flat.TransactionDtos,
    flat.items, flat.Items,
  );
  if (fromFlat.length) return fromFlat;

  for (const k of ['statement', 'Statement', 'creditCardStatement', 'CreditCardStatement']) {
    const inner = raw[k];
    if (inner && typeof inner === 'object') {
      const t = inner.transactions ?? inner.Transactions ?? inner.transactionDtos ?? inner.TransactionDtos;
      if (Array.isArray(t) && t.length) return t;
    }
  }
  return [];
}

function normalizeStatementData(data) {
  if (data == null) return { statementId: null };
  if (Array.isArray(data) && data.length) return normalizeStatementData(data[0]);
  if (typeof data !== 'object') return { statementId: null };
  const d = unwrapStatementPayload(data);

  const statementId =
    d.statementId ??
    d.StatementId ??
    d.creditCardStatementId ??
    d.CreditCardStatementId ??
    d.id ??
    d.Id;

  return { statementId: statementId ?? null };
}

function applyPayloadToStatementState(data, setStatement, setStatementTxs) {
  const meta = normalizeStatementData(data);
  const rawList = extractStatementTransactions(data);
  const txs = (rawList || []).map(normalizeTransaction).filter(Boolean);
  setStatement({ loading: false, error: null, statementId: meta.statementId });
  setStatementTxs(txs);
}

export default function CardDetail({
  card,
  categories,
  members,
  accounts,
  cards,
  onEditTx,
  onDeleteTx,
  onBatchDeleteTx,
  onToggleReviewed,
  onReviewStatement,
  activeMonth,
}) {
  const dueDay   = Number(card.dueDay) || 10;
  const monthStr = activeMonth || curMonth();
  const [fatY, fatM] = monthStr.split('-').map(Number);

  const [statementTxs, setStatementTxs] = useState([]);

  /* A fatura é identificada por (cartão, mês, ano) e a lista vem pronta do statement;
     não filtramos por ano-mês do lançamento. */
  const selTx = useMemo(
    () => statementRows(statementTxs),
    [statementTxs],
  );

  // Estorno subtrai em vez de ser ignorado — ver statementNet.
  const total   = statementNet(selTx);

  const dueDate = new Date(fatY, fatM - 1, dueDay);
  const dueFmt  = dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  const [statement, setStatement] = useState({
    loading: true,
    error: null,
    statementId: null,
  });

  const refetchStatement = useCallback(async () => {
    const data = await cardRepo.getStatement(card.id, fatM, fatY);
    applyPayloadToStatementState(data, setStatement, setStatementTxs);
  }, [card.id, fatM, fatY]);

  useEffect(() => {
    if (!card?.id || !monthStr) {
      setStatement(s => ({ ...s, loading: false }));
      setStatementTxs([]);
      return undefined;
    }
    let cancelled = false;
    setStatement(s => ({ ...s, loading: true, error: null }));
    setStatementTxs([]);
    (async () => {
      try {
        const data = await cardRepo.getStatement(card.id, fatM, fatY);
        if (cancelled) return;
        applyPayloadToStatementState(data, setStatement, setStatementTxs);
      } catch (e) {
        if (cancelled) return;
        setStatement({ loading: false, error: e.message, statementId: null });
        setStatementTxs([]);
      }
    })();
    return () => { cancelled = true; };
  }, [card.id, monthStr, fatM, fatY]);

  const reviewAll = async (reviewed) => {
    await onReviewStatement?.(card.id, statement.statementId, reviewed);
    await refetchStatement();
  };
  const canReviewAll = !!statement.statementId && !statement.loading;

  // Toda mutação de lançamento recarrega a fatura exibida.
  const withRefetch = useCallback(
    (fn) => async (...args) => { await fn?.(...args); await refetchStatement(); },
    [refetchStatement],
  );

  const rows = useMemo(() => selTx.map(tx => ({
    ...tx,
    cardId:         tx.cardId         || String(card.id),
    accountId:      '',
    statementMonth: tx.statementMonth ?? fatM,
    statementYear:  tx.statementYear  ?? fatY,
  })), [selTx, card.id, fatM, fatY]);

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderRadius: 12,
        background: 'var(--surface2)', border: '1px solid var(--border)',
        marginBottom: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Vence dia {dueDay}</span>
          {statement.error && (
            <span style={{ fontSize: 11, color: 'var(--yellow)' }} title={statement.error}>
              · não foi possível carregar a fatura
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            type="button"
            className="btn-icon"
            style={{ padding: '3px 7px', fontSize: 14 }}
            disabled={!canReviewAll}
            onClick={() => reviewAll(true)}
            title="Revisar todos os lançamentos da fatura"
          >✅</button>
          <button
            type="button"
            className="btn-icon"
            style={{ padding: '3px 7px', fontSize: 14 }}
            disabled={!canReviewAll}
            onClick={() => reviewAll(false)}
            title="Desmarcar revisão de todos os lançamentos da fatura"
          >↩️</button>
        </div>
      </div>

      <div className="summary-grid" style={{ marginBottom: 18 }}>
        <div className="summary-box">
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Total da Fatura</div>
          <div style={{ fontSize: 20, fontWeight: 800, ...NUM }}>{statement.loading ? '—' : R$(total)}</div>
        </div>
        <div className="summary-box">
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Vencimento</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{dueFmt}</div>
        </div>
      </div>

      <TxTable
        rows={rows}
        categories={categories}
        members={members}
        accounts={accounts}
        cards={cards}
        onEdit={withRefetch(onEditTx)}
        onDelete={withRefetch(onDeleteTx)}
        onBatchDelete={withRefetch(onBatchDeleteTx)}
        onToggleReviewed={withRefetch(onToggleReviewed)}
        hideCols={['card', 'statement']}
        emptyMsg={statement.loading ? 'Carregando…' : statement.error ? 'Não foi possível carregar a fatura' : 'Nenhum lançamento neste mês'}
      />

    </div>
  );
}
