import React, { useState, useEffect } from 'react';
import { R$ } from '../../core/utils/format';
import { parseMoneyAmount } from '../../core/utils/money';
import { ACC_TYPES } from '../../core/constants/index';
import MonthSelector from '../shared/components/MonthSelector';
import Modal from '../shared/components/Modal';
import AccountTile from './components/AccountTile';
import AccountDetail from './components/AccountDetail';
import AccountForm from './components/AccountForm';

export default function AccountsView({
  accounts, members, categories, cards, onAdd, onEdit, onDelete,
  onEditTx, onDeleteTx, onBatchDeleteTx, onUpdateStatus, notify, transactionsReloadGeneration, activeMonth, setActiveMonth,
}) {
  const [showForm, setShowForm]             = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [f, setF]                           = useState({});
  const [deleteTarget, setDeleteTarget]     = useState(null);

  const selectedId = selectedAccount?.id;
  useEffect(() => {
    if (selectedId == null) return;
    const fresh = accounts.find(x => String(x.id) === String(selectedId));
    if (fresh) setSelectedAccount(fresh);
    else setSelectedAccount(null);
  }, [accounts, selectedId]);

  const openNew = () => {
    setF({ bank: 'Nubank', agency: '', accountNumber: '', initialBalance: '' });
    setShowForm(true);
  };

  const save = () => {
    f.id ? onEdit(f) : onAdd(f);
    setShowForm(false);
  };

  /** Saldo exibido no cartão / cabeçalho: valor da conta retornado pela API (não calculado pelo período local). */
  const accountBalance = acc => parseMoneyAmount(acc?.balance ?? acc?.Balance);

  const select = a => setSelectedAccount(sel => sel?.id === a.id ? null : a);

  const confirmDeleteAccount = () => {
    if (!deleteTarget) return;
    onDelete(deleteTarget.id);
    if (selectedAccount?.id === deleteTarget.id) setSelectedAccount(null);
    setDeleteTarget(null);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Contas</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {activeMonth && setActiveMonth && <MonthSelector month={activeMonth} onChange={setActiveMonth} />}
          <button className="btn btn-primary" onClick={openNew}>+ Nova Conta</button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="empty"><div className="ei">🏦</div><p>Nenhuma conta cadastrada</p></div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
            <div style={{ display: 'flex', gap: 14 }}>
              {accounts.map(a => (
                <div key={a.id} style={{ flex: '0 0 calc(25% - 10.5px)', minWidth: 180 }}>
                  <AccountTile
                    account={a}
                    balance={accountBalance(a)}
                    members={members}
                    selected={selectedAccount?.id === a.id}
                    onSelect={() => select(a)}
                    onEdit={() => { setF(a); setShowForm(true); }}
                    onDelete={() => setDeleteTarget({ id: a.id, name: a.name })}
                  />
                </div>
              ))}
            </div>
          </div>

          {selectedAccount && (
            <div className="detail-panel" style={{ marginTop: 16 }}>
              <div className="flex jcb aic" style={{ marginBottom: 18 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne' }}>{selectedAccount.name} — Lançamentos</h2>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                    {ACC_TYPES[selectedAccount.type] || selectedAccount.type}
                    {selectedAccount.bank ? ' · ' + selectedAccount.bank : ''}
                    {' · Saldo: '}
                    <span style={{ fontWeight: 700, color: accountBalance(selectedAccount) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {R$(accountBalance(selectedAccount))}
                    </span>
                  </p>
                </div>
                <button className="btn-icon" onClick={() => setSelectedAccount(null)}>✕</button>
              </div>
              <AccountDetail
                account={selectedAccount}
                accountLedgerBalance={accountBalance(selectedAccount)}
                transactionsReloadGeneration={transactionsReloadGeneration}
                categories={categories}
                members={members}
                accounts={accounts}
                cards={cards}
                onEditTx={onEditTx}
                onDeleteTx={onDeleteTx}
                onBatchDeleteTx={onBatchDeleteTx}
                onUpdateStatus={onUpdateStatus}
                notify={notify}
                activeMonth={activeMonth}
              />
            </div>
          )}
        </>
      )}

      {showForm && (
        <AccountForm f={f} onChange={setF} onSave={save} onClose={() => setShowForm(false)} members={members} />
      )}

      {deleteTarget && (
        <Modal title="Excluir conta?" onClose={() => setDeleteTarget(null)}>
          <p style={{ marginBottom: 18, lineHeight: 1.5, color: 'var(--muted)' }}>
            Tem certeza que deseja excluir a conta <strong style={{ color: 'var(--text)' }}>{deleteTarget.name}</strong>?
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex jce gap2" style={{ gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancelar</button>
            <button type="button" className="btn btn-danger" onClick={confirmDeleteAccount}>Excluir</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
