import React, { useState, useEffect, useMemo } from 'react';
import { checkingOnly } from '../../application/mappers/index';
import { R$ } from '../../core/utils/format';

import { ACC_TYPES } from '../../core/constants/index';
import MonthSelector from '../shared/components/MonthSelector';
import { txBelongsToMonth } from '../../core/utils/billing';
import Modal from '../shared/components/Modal';
import AccountTile from './components/AccountTile';
import AccountDetail from './components/AccountDetail';
import AccountForm from './components/AccountForm';

export default function AccountsView({
  accounts, members, categories, cards, transactions = [], onAdd, onEdit, onDelete,
  onEditTx, onDeleteTx, onBatchDeleteTx, onToggleReviewed, notify, transactionsReloadGeneration, activeMonth, setActiveMonth,
}) {
  const [showForm, setShowForm]             = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [f, setF]                           = useState({});
  const [deleteTarget, setDeleteTarget]     = useState(null);
  const [sidebarSearch, setSidebarSearch]   = useState('');

  const selectedId = selectedAccount?.id;
  useEffect(() => {
    if (selectedId == null) return;
    const fresh = accounts.find(x => String(x.id) === String(selectedId));
    if (fresh) setSelectedAccount(fresh);
    else setSelectedAccount(null);
  }, [accounts, selectedId]);

  const openNew = () => {
    setF({ bank: 'Nubank', agency: '', accountNumber: '' });
    setShowForm(true);
  };

  const save = () => {
    f.id ? onEdit(f) : onAdd(f);
    setShowForm(false);
  };

  /** Saldo do mês selecionado: receitas − despesas do período. */
  const accountBalance = acc => {
    const { income, expense } = monthFlow(acc?.id);
    return income - expense;
  };

  /**
   * Movimento da conta no mês em exibição, para o card dar uma prévia sem
   * exigir clique — o mesmo papel que o total da fatura cumpre no cartão.
   *
   * O saldo acima vem da API e é acumulado; estes dois são do período.
   */
  const monthFlow = (accountId) => {
    const rows = (transactions || []).filter(t =>
      t.accountId === accountId &&
      !t.cardId &&
      txBelongsToMonth(t, activeMonth));
    const sum = (type) => rows
      .filter(t => t.type === type)
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    return { income: sum('income'), expense: sum('expense') };
  };

  const select = a => setSelectedAccount(sel => sel?.id === a.id ? null : a);

  const sidebarAccounts = useMemo(() => {
    const base = checkingOnly(accounts);
    if (!sidebarSearch.trim()) return base;
    const q = sidebarSearch.trim().toLowerCase();
    return base.filter(a => {
      if (a.bank && a.bank.toLowerCase().includes(q)) return true;
      const mem = members.find(m => m.id === a.memberId);
      if (mem && mem.name.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [accounts, members, sidebarSearch]);

  const totalBalance = useMemo(() =>
    checkingOnly(accounts).reduce((sum, a) => {
      const { income, expense } = monthFlow(a.id);
      return sum + (income - expense);
    }, 0),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [accounts, transactions, activeMonth]);

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
        <div className="cc-list-layout">
          {/* Sidebar com busca e lista de contas */}
          <div className="cc-list-sidebar">
            <div className="cc-list-sidebar-search" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                className="form-input"
                style={{ flex: 1, minWidth: 0, fontSize: 12 }}
                placeholder="🔍 Buscar conta..."
                value={sidebarSearch}
                onChange={e => setSidebarSearch(e.target.value)}
                aria-label="Buscar conta"
              />
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontSize: 9, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Saldo total</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: totalBalance >= 0 ? 'var(--green)' : 'var(--red)', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif" }}>{R$(totalBalance)}</div>
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 10, padding: '10px' }}>
              {sidebarAccounts.length === 0 ? (
                <div style={{ padding: '20px 12px', color: 'var(--muted)', fontSize: 12, textAlign: 'center' }}>
                  Nenhuma conta encontrada
                </div>
              ) : (
                sidebarAccounts.map(a => (
                  <AccountTile
                    key={a.id}
                    account={a}
                    flow={monthFlow(a.id)}
                    monthLabel={activeMonth}
                    members={members}
                    selected={selectedAccount?.id === a.id}
                    onSelect={() => select(a)}
                    onEdit={() => { setF(a); setShowForm(true); }}
                    onDelete={() => setDeleteTarget({ id: a.id, name: a.name })}
                    compact={true}
                  />
                ))
              )}
            </div>
          </div>

          {/* Painel de detalhe */}
          <div className="cc-list-detail">
            {selectedAccount ? (
              <>
                <div className="flex jcb aic" style={{ marginBottom: 18 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne' }}>{selectedAccount.bank} — Lançamentos</h2>
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
                  onToggleReviewed={onToggleReviewed}
                  notify={notify}
                  activeMonth={activeMonth}
                />
              </>
            ) : (
              <div className="cc-list-empty">
                <div style={{ fontSize: 32, marginBottom: 12 }}>🏦</div>
                <div>Selecione uma conta para ver os lançamentos</div>
              </div>
            )}
          </div>
        </div>
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
