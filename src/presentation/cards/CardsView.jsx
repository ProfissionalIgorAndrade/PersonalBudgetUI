import React, { useState, useMemo } from 'react';
import { curMonth } from '../../core/utils/format';
import { COLORS, FLAGS } from '../../core/constants/index';
import { txBelongsToMonth, statementNet } from '../../core/utils/billing';
import { cardLabel } from '../../application/mappers/index';
import { uid } from '../../core/utils/format';
import { useLocalStorage } from '../../core/hooks/useLocalStorage';
import MonthSelector from '../shared/components/MonthSelector';
import Modal from '../shared/components/Modal';
import CardDetail from './components/CardDetail';
import CardForm from './components/CardForm';
import CreditCardCarousel from './components/CreditCardCarousel';
import CreditCardListItem from './components/CreditCardListItem';
import MoreCardsModal from './components/MoreCardsModal';

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

  // ── Modo de visualização (persiste entre sessões) ─────────────────────
  const [viewMode, setViewMode] = useLocalStorage('pb_cards_view', 'cards'); // 'cards' | 'list'

  // ── Estado do carrossel ───────────────────────────────────────────────
  const [carouselStart,  setCarouselStart]  = useState(0);
  const [showMoreModal,  setShowMoreModal]  = useState(false);

  // ── Busca no modo lista ───────────────────────────────────────────────
  const [listSearch, setListSearch] = useState('');

  // ── Helpers ───────────────────────────────────────────────────────────
  const cardStatementTotal = id => {
    const m = activeMonth || curMonth();
    return statementNet(transactions.filter(t => t.cardId === id && txBelongsToMonth(t, m)));
  };

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

  // Selecionar cartão a partir da modal "+N" e ajustar o carrossel
  const handleSelectFromModal = (card, cardIndex) => {
    setSelectedCardId(card.id);
    setCarouselStart(cardIndex); // o carrossel faz o clamp internamente
    setShowMoreModal(false);
  };

  // Cartões filtrados no modo lista
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
          {/* Toggle Cards / Lista */}
          <div className="cards-view-toggle" role="group" aria-label="Modo de visualização">
            <button
              className={`cards-view-toggle-btn${viewMode === 'cards' ? ' active' : ''}`}
              onClick={() => setViewMode('cards')}
            >
              ◫ Cards
            </button>
            <button
              className={`cards-view-toggle-btn${viewMode === 'list' ? ' active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              ☰ Lista
            </button>
          </div>

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
        <>
          {/* ═══════════════════════════════════════════════════════════
              MODO CARDS
          ═══════════════════════════════════════════════════════════ */}
          {viewMode === 'cards' && (
            <>
              <CreditCardCarousel
                cards={cards}
                members={members}
                selectedCardId={selectedCardId}
                cardStatementTotal={cardStatementTotal}
                activeMonth={activeMonth || curMonth()}
                onSelect={select}
                onEdit={c => { setF(c); setShowForm(true); }}
                onDelete={c => setDeleteTarget({ id: c.id, name: c.name })}
                onOpenMore={() => setShowMoreModal(true)}
                startIndex={carouselStart}
                onStartIndexChange={setCarouselStart}
              />

              {/* Detalhe do cartão selecionado */}
              {selectedCard && (
                <div className="detail-panel" style={{ marginTop: 16 }}>
                  <div className="flex jcb aic" style={{ marginBottom: 18 }}>
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne' }}>
                        {cardLabel(selectedCard, members)} — Faturas
                      </h2>
                      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                        {FLAGS[selectedCard.flag] || 'Cartão'} · Fecha dia {selectedCard.closingDay || '?'} · Vence dia {selectedCard.dueDay || '?'}
                      </p>
                    </div>
                    <button className="btn-icon" onClick={() => setSelectedCardId(null)}>✕</button>
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
                </div>
              )}
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════
              MODO LISTA (sidebar + detalhe central)
          ═══════════════════════════════════════════════════════════ */}
          {viewMode === 'list' && (
            <div className="cc-list-layout">
              {/* Sidebar com busca e lista de cartões */}
              <div className="cc-list-sidebar">
                <div className="cc-list-sidebar-search">
                  <input
                    className="form-input"
                    style={{ width: '100%', fontSize: 12 }}
                    placeholder="🔍 Buscar cartão..."
                    value={listSearch}
                    onChange={e => setListSearch(e.target.value)}
                    aria-label="Buscar cartão"
                  />
                </div>
                <div className="cc-list-sidebar-items">
                  {listCards.length === 0 ? (
                    <div style={{ padding: '20px 12px', color: 'var(--muted)', fontSize: 12, textAlign: 'center' }}>
                      Nenhum cartão encontrado
                    </div>
                  ) : (
                    listCards.map(c => (
                      <CreditCardListItem
                        key={c.id}
                        card={c}
                        members={members}
                        spent={cardStatementTotal(c.id)}
                        selected={selectedCardId === c.id}
                        onSelect={() => select(c)}
                        onEdit={() => { setF(c); setShowForm(true); }}
                        onDelete={() => setDeleteTarget({ id: c.id, name: c.name })}
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
        </>
      )}

      {/* ── Modal "+ N Cartões" ── */}
      {showMoreModal && (
        <MoreCardsModal
          cards={cards}
          members={members}
          cardStatementTotal={cardStatementTotal}
          activeMonth={activeMonth || curMonth()}
          selectedCardId={selectedCardId}
          onClose={() => setShowMoreModal(false)}
          onSelectCard={handleSelectFromModal}
        />
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
