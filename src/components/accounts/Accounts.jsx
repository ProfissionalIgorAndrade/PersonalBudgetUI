import React, { useState } from 'react';
import { R$ } from '../../utils/format';
import { BANK_LABELS } from '../../api/mappers';
import CurrencyInput from '../ui/CurrencyInput';
import MonthSelector from '../ui/MonthSelector';
import Modal from '../ui/Modal';
import AccountDetail from './AccountDetail';

const BANKS = Object.entries(BANK_LABELS).map(([k, v]) => ({ value: k, label: v }));

/* ── account tile ────────────────────────────────────────────── */
function AccTile({ account, balance, members, selected, onSelect, onEdit, onDelete }) {
  const mem = members.find(m => m.id === account.memberId);
  return (
    <div style={{
      borderRadius: 14,
      outline: selected ? '2px solid var(--primary)' : '2px solid transparent',
      outlineOffset: 3,
      transition: 'outline-color .2s',
    }}>
      {/* top: colored accent band + info */}
      <div
        className="cc-clickable"
        style={{
          background: `linear-gradient(135deg, ${account.color}18, ${account.color}30)`,
          borderRadius: '12px 12px 0 0',
          border: `1px solid ${account.color}40`,
          borderBottom: 'none',
          padding: '18px 18px 16px',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }}
        onClick={onSelect}
      >
        {/* decorative blob */}
        <div style={{
          position: 'absolute', right: -20, top: -20,
          width: 110, height: 110, borderRadius: '50%',
          background: `${account.color}12`,
        }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3, fontWeight: 600, letterSpacing: .5 }}>
            {ACC_TYPES[account.type] || account.type}{account.bank ? ` · ${account.bank}` : ''}
          </div>
          <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, marginBottom: 14 }}>{account.name}</div>
          <div style={{
            fontSize: 26, fontWeight: 800, fontFamily: 'Syne',
            color: balance >= 0 ? 'var(--green)' : 'var(--red)',
          }}>
            {R$(balance)}
          </div>
          {mem && (
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 10 }}>{mem.emoji} {mem.name}</div>
          )}
        </div>
        {/* bottom color stripe */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 3, background: account.color, borderRadius: 0,
        }} />
        <div style={{ position: 'absolute', top: 10, right: 14, fontSize: 10, opacity: .45, fontWeight: 600 }}>
          {selected ? '▼ Aberto' : 'Ver lançamentos →'}
        </div>
      </div>

      {/* bottom: actions */}
      <div className="card-sm" style={{ borderRadius: '0 0 12px 12px', borderTop: 'none', paddingTop: 10 }}>
        <div className="flex gap2" style={{ gap: 6, justifyContent: 'flex-end' }}>
          <button className="btn-icon" onClick={onEdit}>✏️</button>
          <button className="btn-icon" onClick={onDelete}>🗑️</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function Accounts({ accounts, members, transactions, categories, cards, onAdd, onEdit, onDelete, onEditTx, onDeleteTx, activeMonth, setActiveMonth }) {
  const [modal, setModal] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [f, setF] = useState({});
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const openNew = () => {
    setF({ bank: 'Nubank', agency: '', accountNumber: '', initialBalance: '' });
    setModal('form');
  };
  const save = () => {
    f.id ? onEdit(f) : onAdd(f);
    setModal(null);
  };

  const calcBalance = acc => {
    const base = Number(acc.balance) || 0;
    const delta = transactions
      .filter(t => t.accountId === acc.id && t.status === 'paid')
      .reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
    return base + delta;
  };

  const totalBalance = accounts.reduce((s, a) => s + calcBalance(a), 0);
  const select = a => setSelectedAccount(sel => sel?.id === a.id ? null : a);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Contas</h1>
          <p className="page-sub">
            Saldo consolidado:{' '}
            <span style={{ color: totalBalance >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
              {R$(totalBalance)}
            </span>
          </p>
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
          {/* ── horizontal scroll row ───────────────────────── */}
          <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
            <div style={{ display: 'flex', gap: 14 }}>
              {accounts.map(a => (
                <div key={a.id} style={{ flex: '0 0 calc(25% - 10.5px)', minWidth: 180 }}>
                  <AccTile
                    account={a}
                    balance={calcBalance(a)}
                    members={members}
                    selected={selectedAccount?.id === a.id}
                    onSelect={() => select(a)}
                    onEdit={() => { setF(a); setModal('form'); }}
                    onDelete={() => onDelete(a.id)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── detail panel below ──────────────────────────── */}
          {selectedAccount && (
            <div className="detail-panel" style={{ marginTop: 16 }}>
              <div className="flex jcb aic" style={{ marginBottom: 18 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne' }}>
                    {selectedAccount.name} — Lançamentos
                  </h2>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                    {ACC_TYPES[selectedAccount.type] || selectedAccount.type}
                    {selectedAccount.bank ? ' · ' + selectedAccount.bank : ''}
                    {' · Saldo: '}
                    <span style={{
                      fontWeight: 700,
                      color: calcBalance(selectedAccount) >= 0 ? 'var(--green)' : 'var(--red)',
                    }}>
                      {R$(calcBalance(selectedAccount))}
                    </span>
                  </p>
                </div>
                <button className="btn-icon" onClick={() => setSelectedAccount(null)}>✕</button>
              </div>
              <AccountDetail
                account={selectedAccount}
                transactions={transactions}
                categories={categories}
                members={members}
                accounts={accounts}
                cards={cards}
                onEditTx={onEditTx}
                onDeleteTx={onDeleteTx}
              />
            </div>
          )}
        </>
      )}

      {/* ── form modal ──────────────────────────────────────── */}
      {modal === 'form' && (
        <Modal title={f.id ? 'Editar Conta' : 'Nova Conta'} onClose={() => setModal(null)}>
          <div className="form-group">
            <label className="form-label">Banco *</label>
            <select className="form-select" value={f.bank} onChange={e => set('bank', e.target.value)}>
              {BANKS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Agência</label>
              <input className="form-input" value={f.agency} onChange={e => set('agency', e.target.value)} placeholder="0001" />
            </div>
            <div className="form-group">
              <label className="form-label">Número da Conta</label>
              <input className="form-input" value={f.accountNumber} onChange={e => set('accountNumber', e.target.value)} placeholder="12345-6" />
            </div>
          </div>
          {!f.id && (
            <div className="form-group">
              <label className="form-label">Saldo Inicial (R$)</label>
              <CurrencyInput value={f.initialBalance} onChange={v => set('initialBalance', v)} />
            </div>
          )}
          <div className="flex jce gap2" style={{ gap: 8, marginTop: 8 }}>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save}>💾 Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
