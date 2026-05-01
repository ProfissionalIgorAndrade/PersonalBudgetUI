import React, { useState } from 'react';
import { uid, curMonth, R$ } from '../../utils/format';
import CurrencyInput from '../ui/CurrencyInput';
import { COLORS, FLAGS } from '../../constants';
import Modal from '../ui/Modal';
import MonthSelector from '../ui/MonthSelector';
import ColorPick from '../ui/ColorPick';
import CardDetail from './CardDetail';

const GRAD = {
  '#2dd4bf': 'linear-gradient(135deg,#0d3330,#1a4a3a)',
  '#fb923c': 'linear-gradient(135deg,#431407,#7c2d12)',
  '#4ade80': 'linear-gradient(135deg,#052e16,#14532d)',
  '#f87171': 'linear-gradient(135deg,#450a0a,#7f1d1d)',
  '#818cf8': 'linear-gradient(135deg,#1e1b4b,#312e81)',
  '#fbbf24': 'linear-gradient(135deg,#451a03,#78350f)',
  '#1e3a5f': 'linear-gradient(135deg,#0c1a3a,#1e3a5f)',
  '#134e4a': 'linear-gradient(135deg,#042f2e,#134e4a)',
};
const getGrad = c => GRAD[c] || `linear-gradient(135deg,${c}33,${c}55)`;

/* ── card tile ───────────────────────────────────────────────── */
function CardTile({ card, spent, members, selected, onSelect, onEdit, onDelete }) {
  const mem    = members.find(m => m.id === card.memberId);
  const usePct = card.limit > 0 ? Math.min(spent / card.limit * 100, 100) : 0;
  return (
    <div style={{
      borderRadius: 14,
      outline: selected ? '2px solid var(--primary)' : '2px solid transparent',
      outlineOffset: 3,
      transition: 'outline-color .2s',
    }}>
      <div
        className="cc-visual cc-clickable"
        style={{ background: getGrad(card.color), padding: '14px 16px', minHeight: 110 }}
        onClick={onSelect}
      >
        <div>
          <div style={{ fontSize: 10, opacity: .6, marginBottom: 2 }}>{FLAGS[card.flag] || 'Cartão'}</div>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15 }}>{card.name}</div>
        </div>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: 2, opacity: .8 }}>
            •••• •••• •••• {card.lastDigits || '????'}
          </div>
          <div className="flex jcb" style={{ marginTop: 6, fontSize: 9, opacity: .65 }}>
            <span>Fecha {card.closingDay || '?'} · Vence {card.dueDay || '?'}</span>
            <span>{mem?.emoji} {mem?.name}</span>
          </div>
        </div>
        <div style={{ position: 'absolute', top: 8, right: 10, fontSize: 9, opacity: .5, fontWeight: 600 }}>
          {selected ? '▼ Aberto' : 'Ver faturas →'}
        </div>
      </div>
      <div className="card-sm" style={{ borderRadius: '0 0 12px 12px', borderTop: 'none', padding: '8px 12px 10px' }}>
        <div className="flex jcb aic" style={{ marginBottom: 4 }}>
          <span className="txxs tmuted">Gasto este mês</span>
          <span className="txxs tmuted">{R$(spent)} / {R$(card.limit)}</span>
        </div>
        <div className="progress-bar" style={{ marginBottom: 8 }}>
          <div className="progress-fill" style={{
            width: usePct + '%',
            background: usePct > 80 ? 'var(--red)' : usePct > 50 ? 'var(--yellow)' : 'var(--primary)',
          }} />
        </div>
        <div className="flex jcb aic">
          <span style={{ fontSize: 13, fontWeight: 700, color: usePct > 80 ? 'var(--red)' : 'var(--text)' }}>
            {usePct.toFixed(0)}%
          </span>
          <div style={{ display: 'flex', gap: 5 }}>
            <button className="btn-icon" style={{ padding: '3px 7px', fontSize: 12 }} onClick={onEdit}>✏️</button>
            <button className="btn-icon" style={{ padding: '3px 7px', fontSize: 12 }} onClick={onDelete}>🗑️</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function Cards({ cards, members, transactions, categories, accounts, onAdd, onEdit, onDelete, onEditTx, onDeleteTx, activeMonth, setActiveMonth }) {
  const [modal, setModal]         = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [f, setF]                 = useState({});
  const [closedFaturas, setClosedFaturas] = useState({});
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const openNew = () => {
    setF({ name: '', flag: 'visa', lastDigits: '', limit: '', closingDay: '', dueDay: '', color: COLORS[0], memberId: members[0]?.id || '', accountId: accounts[0]?.id || '' });
    setModal('form');
  };
  const save = () => {
    const c = { ...f, id: f.id || uid(), limit: Number(f.limit) };
    f.id ? onEdit(c) : onAdd(c);
    setModal(null);
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
          <p className="page-sub">{cards.length} cartão(ões)</p>
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
          {/* ── horizontal scroll row ───────────────────────── */}
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
                    onEdit={() => { setF(c); setModal('form'); }}
                    onDelete={() => onDelete(c.id)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── detail panel below ──────────────────────────── */}
          {selectedCard && (
            <div className="detail-panel" style={{ marginTop: 16 }}>
              <div className="flex jcb aic" style={{ marginBottom: 18 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne' }}>
                    {selectedCard.name} — Faturas
                  </h2>
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
              />
            </div>
          )}
        </>
      )}

      {/* ── form modal ──────────────────────────────────────── */}
      {modal === 'form' && (
        <Modal title={f.id ? 'Editar Cartão' : 'Novo Cartão'} onClose={() => setModal(null)}>
          <div className="form-group">
            <label className="form-label">Nome do Cartão</label>
            <input className="form-input" value={f.name} onChange={e => set('name', e.target.value)} placeholder="Nubank, Inter, C6..." />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Bandeira</label>
              <select className="form-select" value={f.flag} onChange={e => set('flag', e.target.value)}>
                {Object.entries(FLAGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Últimos 4 Dígitos</label>
              <input className="form-input" maxLength="4" value={f.lastDigits} onChange={e => set('lastDigits', e.target.value)} placeholder="1234" />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Limite (R$)</label>
              <CurrencyInput value={f.limit} onChange={v => set('limit', v)} placeholder="5.000,00" />
            </div>
            <div className="form-group">
              <label className="form-label">Membro</label>
              <select className="form-select" value={f.memberId} onChange={e => set('memberId', e.target.value)}>
                {members.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Conta para débito da fatura *</label>
            <select className="form-select" required value={f.accountId} onChange={e => set('accountId', e.target.value)}>
              <option value="">— Selecione uma conta —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>🏦 {a.name}</option>)}
            </select>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Dia Fechamento</label>
              <input className="form-input" type="number" min="1" max="31" value={f.closingDay} onChange={e => set('closingDay', e.target.value)} placeholder="20" />
            </div>
            <div className="form-group">
              <label className="form-label">Dia Vencimento</label>
              <input className="form-input" type="number" min="1" max="31" value={f.dueDay} onChange={e => set('dueDay', e.target.value)} placeholder="27" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Cor</label>
            <ColorPick val={f.color} onChange={v => set('color', v)} />
          </div>
          <div className="flex jce gap2" style={{ gap: 8, marginTop: 8 }}>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save}>💾 Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
