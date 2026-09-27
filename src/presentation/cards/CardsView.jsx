import React, { useState, useMemo, useCallback } from 'react';
import { curMonth, R$ } from '../../core/utils/format';
import { COLORS, FLAGS } from '../../core/constants/index';
import { txBelongsToMonth, statementNet } from '../../core/utils/billing';
import { cardLabel } from '../../application/mappers/index';
import { uid } from '../../core/utils/format';
import MonthSelector from '../shared/components/MonthSelector';
import Modal from '../shared/components/Modal';
import CardDetail from './components/CardDetail';
import CardForm from './components/CardForm';
import CardTile from './components/CardTile';

export default function CardsView({
  cards, members, transactions, categories, accounts,
  onAdd, onEdit, onDelete,
  onEditTx, onDeleteTx, onBatchDeleteTx,
  activeMonth, setActiveMonth,
  notify, loadTransactions,
}) {
  // ── Formulário e exclusão ─────────────────────────────────────────────
  const [showForm,      setShowForm]      = useState(false);
  const [f,             setF]             = useState({});
  const [deleteTarget,  setDeleteTarget]  = useState(null);

  // ── Seleção de cartão ─────────────────────────────────────────────────
  const [selectedCardId, setSelectedCardId] = useState(null);
  const selectedCard = selectedCardId ? (cards.find(c => c.id === selectedCardId) ?? null) : null;

  // ── Busca na sidebar ──────────────────────────────────────────────────
  const [listSearch, setListSearch] = useState('');

  // ── Helpers ───────────────────────────────────────────────────────────
  const cardStatementTotal = useCallback(id => {
    const m = activeMonth || curMonth();
    return statementNet(transactions.filter(t => t.cardId === id && txBelongsToMonth(t, m)));
  }, [transactions, activeMonth]);

  const totalAllCards = useMemo(() =>
    cards.reduce((sum, c) => sum + cardStatementTotal(c.id), 0),
  [cards, cardStatementTotal]);

  const select = c => setSelectedCardId(id => id === c.id ? null : c.id);

  const openNew = () => {
    setF({
      name: '', flag: 'visa', lastDigits: '', limit: '', closingDay: '', dueDay: '',
      color: COLORS[0],
      memberId:  members[0]?.id  || '',
      accountId: accounts[0]?.id || '',
    });
    setShowForm(true);
  };

  const save = () => {
    const c = { ...f, id: f.id || uid(), limit: Number(f.limit) };
    f.id ? onEdit(c) : onAdd(c);
    setShowForm(false);
  };

  const confirmDeleteCard = () => {
    if (!deleteTarget) return;
    onDelete(deleteTarget.id);
    if (selectedCardId === deleteTarget.id) setSelectedCardId(null);
    setDeleteTarget(null);
  };

  // Cartões filtrados na sidebar
  const listCards = useMemo(() => {
    if (!listSearch.trim()) return cards;
    const q = listSearch.trim().toLowerCase();
    return cards.filter(c => {
      if (c.name.toLowerCase().includes(q)) return true;
      const mem = members.find(m => m.id === c.memberId);
      if (mem && mem.name.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [cards, members, listSearch]);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Cabeçalho ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Cartões de Crédito</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {activeMonth && setActiveMonth && (
            <MonthSelector month={activeMonth} onChange={setActiveMonth} />
          )}
          <button className="btn btn-primary" onClick={openNew}>+ Novo Cartão</button>
        </div>
      </div>

      {/* ── Estado vazio ── */}
      {cards.length === 0 ? (
        <div className="empty">
          <div className="ei">💳</div>
          <p>Nenhum cartão cadastrado ainda</p>
        </div>
      ) : (
        <div className="cc-list-layout">
          {/* Sidebar com busca e lista de cartões */}
          <div className="cc-list-sidebar">
            <div className="cc-list-sidebar-search" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                className="form-input"
                style={{ flex: 1, minWidth: 0, fontSize: 12 }}
                placeholder="🔍 Buscar cartão..."
                value={listSearch}
                onChange={e => setListSearch(e.target.value)}
                aria-label="Buscar cartão"
              />
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontSize: 9, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Total faturas</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif" }}>{R$(totalAllCards)}</div>
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 10, padding: '10px' }}>
              {listCards.length === 0 ? (
                <div style={{ padding: '20px 12px', color: 'var(--muted)', fontSize: 12, textAlign: 'center' }}>
                  Nenhum cartão encontrado
                </div>
              ) : (
                listCards.map(c => (
                  <CardTile
                    key={c.id}
                    card={c}
                    spent={cardStatementTotal(c.id)}
                    statementMonth={activeMonth}
                    members={members}
                    selected={selectedCardId === c.id}
                    onSelect={() => select(c)}
                    onEdit={() => { setF(c); setShowForm(true); }}
                    onDelete={() => setDeleteTarget({ id: c.id, name: c.name })}
                    compact={true}
                  />
                ))
              )}
            </div>
          </div>

          {/* Painel central */}
          <div className="cc-list-detail">
            {selectedCard ? (
              <>
                <div className="flex jcb aic" style={{ marginBottom: 18 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne' }}>
                      {cardLabel(selectedCard, members)}
                    </h2>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                      {FLAGS[selectedCard.flag] || 'Cartão'} · Fecha dia {selectedCard.closingDay || '?'} · Vence dia {selectedCard.dueDay || '?'}
                    </p>
                  </div>
                </div>
                <CardDetail
                  card={selectedCard}
                  categories={categories}
                  members={members}
                  accounts={accounts}
                  cards={cards}
                  onEditTx={onEditTx}
                  onDeleteTx={onDeleteTx}
                  onBatchDeleteTx={onBatchDeleteTx}
                  activeMonth={activeMonth}
                  notify={notify}
                  loadTransactions={loadTransactions}
                />
              </>
            ) : (
              <div className="cc-list-empty">
                <div style={{ fontSize: 32, marginBottom: 12 }}>💳</div>
                <div>Selecione um cartão para ver os detalhes</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Formulário de cartão ── */}
      {showForm && (
        <CardForm
          f={f}
          members={members}
          accounts={accounts}
          onChange={setF}
          onSave={save}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* ── Confirmação de exclusão ── */}
      {deleteTarget && (
        <Modal title="Excluir cartão?" onClose={() => setDeleteTarget(null)}>
          <p style={{ marginBottom: 18, lineHeight: 1.5, color: 'var(--muted)' }}>
            Tem certeza que deseja excluir o cartão{' '}
            <strong style={{ color: 'var(--text)' }}>{deleteTarget.name}</strong>?{' '}
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex jce gap2" style={{ gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancelar</button>
            <button type="button" className="btn btn-danger" onClick={confirmDeleteCard}>Excluir</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
