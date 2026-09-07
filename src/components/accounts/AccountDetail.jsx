import React, { useState } from 'react';
import { R$, monthLabel } from '../../utils/format';
import TxTable from '../transactions/TxTable';

export default function AccountDetail({ account, transactions, categories, members, accounts, cards, onEditTx, onDeleteTx }) {
  const now = new Date();

  const months6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return d.toISOString().slice(0, 7);
  });

  const [selected, setSelected] = useState(months6[0]);

  const accTx   = transactions.filter(t => t.accountId === account.id);
  const monthTx = accTx.filter(t => t.date?.startsWith(selected));

  const income  = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expense;

  return (
    <div>
      {/* month tabs */}
      <div className="fatura-tabs">
        {months6.map(m => {
          const cnt = accTx.filter(t => t.date?.startsWith(m)).length;
          return (
            <div key={m} className={`fatura-tab${selected === m ? ' active' : ''}`} onClick={() => setSelected(m)}>
              {monthLabel(m)}
              {cnt > 0 && <span style={{ marginLeft: 5, opacity: .7 }}>({cnt})</span>}
            </div>
          );
        })}
      </div>

      {/* summary boxes */}
      <div className="summary-grid" style={{ marginBottom: 18 }}>
        <div className="summary-box">
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Receitas</div>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne', color: 'var(--green)' }}>{R$(income)}</div>
        </div>
        <div className="summary-box">
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Despesas</div>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne', color: 'var(--red)' }}>{R$(expense)}</div>
        </div>
        <div className="summary-box" style={{ gridColumn: '1/-1' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Saldo do Período</div>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Syne', color: balance >= 0 ? 'var(--green)' : 'var(--red)' }}>{R$(balance)}</div>
        </div>
      </div>

      {/* transactions table */}
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
