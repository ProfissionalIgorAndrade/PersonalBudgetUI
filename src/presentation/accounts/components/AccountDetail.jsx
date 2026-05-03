import React, { useState, useEffect, useCallback } from 'react';
import * as accountRepo from '../../../data/repositories/accountRepository';
import { normalizeTransaction } from '../../../application/mappers';
import { R$ } from '../../../core/utils/format';
import { parseMoneyAmount } from '../../../core/utils/money';
import TxTable from '../../transactions/components/TxTable';

const NUM = { fontFamily: "'Inter', sans-serif", fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1' };

function parseCalendarMonth(ym) {
  if (!ym || typeof ym !== 'string') return null;
  const [yPart, moPart] = ym.split('-');
  const year = Number(yPart);
  const month = Number(moPart);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
}

export default function AccountDetail({
  account,
  accountLedgerBalance,
  transactionsReloadGeneration,
  categories,
  members,
  accounts,
  cards,
  onEditTx,
  onDeleteTx,
  onUpdateStatus,
  activeMonth,
  notify,
}) {
  const [monthTx, setMonthTx]     = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);

  const handleUpdateStatus = useCallback(async (id, uiStatus) => {
    try {
      await onUpdateStatus(id, uiStatus);
      setMonthTx(prev => prev.map(t => String(t.id) === String(id) ? { ...t, status: uiStatus } : t));
    } catch {
      /* erro já tratado pelo useAppData */
    }
  }, [onUpdateStatus]);

  /* Refetch do mês após reload global; saldo da conta vem de `accounts` (atualizado no PATCH de status). */
  useEffect(() => {
    let cancelled = false;

    const cal = parseCalendarMonth(activeMonth);
    if (!account?.id || !cal) {
      setMonthTx([]);
      setLoadingTx(false);
      return () => { cancelled = true; };
    }

    setLoadingTx(true);
    setMonthTx([]);
    accountRepo
      .listAccountTransactions(account.id, { month: cal.month, year: cal.year })
      .then((raw) => {
        if (cancelled) return;
        const list = Array.isArray(raw) ? raw : raw?.items ?? raw?.data ?? [];
        setMonthTx((list || []).map(normalizeTransaction).filter(Boolean));
      })
      .catch((e) => {
        if (cancelled) return;
        setMonthTx([]);
        notify?.(e.message, 'error');
      })
      .finally(() => {
        if (!cancelled) setLoadingTx(false);
      });

    return () => { cancelled = true; };
  }, [account?.id, activeMonth, transactionsReloadGeneration, notify]);

  const income  = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const ledgerSaldo = typeof accountLedgerBalance === 'number' && Number.isFinite(accountLedgerBalance)
    ? accountLedgerBalance
    : parseMoneyAmount(account?.balance ?? account?.Balance);

  return (
    <div>
      {loadingTx && (
        <p className="tmuted txxs" style={{ marginBottom: 12 }}>
          Carregando lançamentos desta conta no período…
        </p>
      )}
      <div className="summary-grid" style={{ marginBottom: 18 }}>
        <div className="summary-box">
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Receitas</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)', ...NUM }}>{loadingTx ? '—' : R$(income)}</div>
        </div>
        <div className="summary-box">
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Despesas</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--red)', ...NUM }}>{loadingTx ? '—' : R$(expense)}</div>
        </div>
        <div className="summary-box" style={{ gridColumn: '1/-1' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Saldo da conta</div>
          <div style={{
            fontSize: 20,
            fontWeight: 800,
            color: ledgerSaldo >= 0 ? 'var(--green)' : 'var(--red)',
            ...NUM,
          }}>
            {R$(ledgerSaldo)}
          </div>
        </div>
      </div>

      <TxTable
        rows={monthTx}
        categories={categories}
        members={members}
        accounts={accounts}
        cards={cards}
        onEdit={onEditTx}
        onDelete={onDeleteTx}
        onUpdateStatus={handleUpdateStatus}
        hideCols={['account']}
        emptyMsg={loadingTx ? 'Carregando…' : 'Nenhum lançamento neste mês'}
      />
    </div>
  );
}
