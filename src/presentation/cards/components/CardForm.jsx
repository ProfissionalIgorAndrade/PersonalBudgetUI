import React from 'react';
import { FLAGS, COLORS } from '../../../core/constants/index';
import CurrencyInput from '../../shared/components/CurrencyInput';
import ColorPick from '../../shared/components/ColorPick';
import Modal from '../../shared/components/Modal';

export default function CardForm({ f, members, accounts, onChange, onSave, onClose }) {
  const set = (k, v) => onChange({ ...f, [k]: v });

  return (
    <Modal title={f.id ? 'Editar Cartão' : 'Novo Cartão'} onClose={onClose}>
      <div className="form-group">
        <label className="form-label">Nome do Cartão</label>
        <input className="form-input" value={f.name || ''} onChange={e => set('name', e.target.value)} placeholder="Nubank, Inter, C6..." />
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Bandeira</label>
          <select className="form-select" value={f.flag || 'visa'} onChange={e => set('flag', e.target.value)}>
            {Object.entries(FLAGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Últimos 4 Dígitos</label>
          <input className="form-input" maxLength="4" value={f.lastDigits || ''} onChange={e => set('lastDigits', e.target.value)} placeholder="1234" />
        </div>
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Limite (R$)</label>
          <CurrencyInput value={f.limit || ''} onChange={v => set('limit', v)} placeholder="5.000,00" />
        </div>
        <div className="form-group">
          <label className="form-label">Membro</label>
          <select className="form-select" value={f.memberId || ''} onChange={e => set('memberId', e.target.value)}>
            {members.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Conta para débito da fatura *</label>
        <select className="form-select" required value={f.accountId || ''} onChange={e => set('accountId', e.target.value)}>
          <option value="">— Selecione uma conta —</option>
          {accounts.map(a => <option key={a.id} value={a.id}>🏦 {a.name}</option>)}
        </select>
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Dia Fechamento</label>
          <input className="form-input" type="number" min="1" max="31" value={f.closingDay || ''} onChange={e => set('closingDay', e.target.value)} placeholder="20" />
        </div>
        <div className="form-group">
          <label className="form-label">Dia Vencimento</label>
          <input className="form-input" type="number" min="1" max="31" value={f.dueDay || ''} onChange={e => set('dueDay', e.target.value)} placeholder="27" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Cor</label>
        <ColorPick val={f.color || COLORS[0]} onChange={v => set('color', v)} />
      </div>
      <div className="flex jce gap2" style={{ gap: 8, marginTop: 8 }}>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={onSave}>💾 Salvar</button>
      </div>
    </Modal>
  );
}
