import React from 'react';
import { R$ } from '../../../core/utils/format';
import TxTable from '../../transactions/components/TxTable';

const NUM = { fontFamily: "'Inter', sans-serif", fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1' };

export default function AccountDetail({ account, transactions, categories, members, accounts, cards, onEditTx, onDeleteTx, activeMonth }) {
  const accTx   = transactions.filter(t => t.accountId === account.id);
  const monthTx = accTx.filter(t => t.date?.startsWith(activeMonth));

  const income  = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expense;

  return (
    <div>
      <div className="summary-grid" style={{ marginBottom: 18 }}>
        <div className="summary-box">
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Receitas</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)', ...NUM }}>{R$(income)}</div>
        </div>
        <div className="summary-box">
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Despesas</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--red)', ...NUM }}>{R$(expense)}</div>
        </div>
        <div className="summary-box" style={{ gridColumn: '1/-1' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Saldo do Período</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: balance >= 0 ? 'var(--green)' : 'var(--red)', ...NUM }}>{R$(balance)}</div>
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
        hideCols={['account']}
        emptyMsg="Nenhum lançamento neste mês"
      />
    </div>
  );
}
