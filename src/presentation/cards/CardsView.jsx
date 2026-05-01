import React, { useState } from 'react';
import { curMonth } from '../../core/utils/format';
import { COLORS, FLAGS } from '../../core/constants/index';
import { uid } from '../../core/utils/format';
import MonthSelector from '../shared/components/MonthSelector';
import CardTile from './components/CardTile';
import CardDetail from './components/CardDetail';
import CardForm from './components/CardForm';

export default function CardsView({ cards, members, transactions, categories, accounts, onAdd, onEdit, onDelete, onEditTx, onDeleteTx, activeMonth, setActiveMonth }) {
  const [showForm, setShowForm]         = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [f, setF]                       = useState({});
  const [closedFaturas, setClosedFaturas] = useState({});

  const openNew = () => {
    setF({ name: '', flag: 'visa', lastDigits: '', limit: '', closingDay: '', dueDay: '', color: COLORS[0], memberId: members[0]?.id || '', accountId: accounts[0]?.id || '' });
    setShowForm(true);
  };

  const save = () => {
    const c = { ...f, id: f.id || uid(), limit: Number(f.limit) };
    f.id ? onEdit(c) : onAdd(c);
    setShowForm(false);
  };

  const cardSpend = id => {
    const m = curMonth();
    return transactions
      .filter(t => t.cardId === id && t.date?.startsWith(m) && t.type === 'expense' && t.status !== 'cancelled')
      .reduce((s, t) => s + Number(t.amount), 0);
  };

  const select = c => setSelectedCard(sel => sel?.id === c.id ? null : c);

  const handleCloseFatura = (cardId, month) =>
    setClosedFaturas(prev => ({ ...prev, [`${cardId}_${month}`]: true }));

  const isFaturaClosed = (cardId, month) => !!closedFaturas[`${cardId}_${month}`];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cartões de Crédito</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {activeMonth && setActiveMonth && <MonthSelector month={activeMonth} onChange={setActiveMonth} />}
          <button className="btn btn-primary" onClick={openNew}>+ Novo Cartão</button>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="empty"><div className="ei">💳</div><p>Nenhum cartão cadastrado ainda</p></div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
            <div style={{ display: 'flex', gap: 14 }}>
              {cards.map(c => (
                <div key={c.id} style={{ flex: '0 0 calc(25% - 10.5px)', minWidth: 180 }}>
                  <CardTile
                    card={c}
                    spent={cardSpend(c.id)}
                    members={members}
                    selected={selectedCard?.id === c.id}
                    onSelect={() => select(c)}
                    onEdit={() => { setF(c); setShowForm(true); }}
                    onDelete={() => onDelete(c.id)}
                  />
                </div>
              ))}
            </div>
          </div>

          {selectedCard && (
            <div className="detail-panel" style={{ marginTop: 16 }}>
              <div className="flex jcb aic" style={{ marginBottom: 18 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne' }}>{selectedCard.name} — Faturas</h2>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                    {FLAGS[selectedCard.flag] || 'Cartão'} · Fecha dia {selectedCard.closingDay || '?'} · Vence dia {selectedCard.dueDay || '?'}
                  </p>
                </div>
                <button className="btn-icon" onClick={() => setSelectedCard(null)}>✕</button>
              </div>
              <CardDetail
                card={selectedCard}
                transactions={transactions}
                categories={categories}
                members={members}
                accounts={accounts}
                cards={cards}
                onEditTx={onEditTx}
                onDeleteTx={onDeleteTx}
                isFaturaClosed={m => isFaturaClosed(selectedCard.id, m)}
                onCloseFatura={m => handleCloseFatura(selectedCard.id, m)}
                activeMonth={activeMonth}
              />
            </div>
          )}
        </>
      )}

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
    </div>
  );
}
