import React from 'react';
import { BANK_LABELS } from '../../../application/mappers/index';
import CurrencyInput from '../../shared/components/CurrencyInput';
import Modal from '../../shared/components/Modal';

const BANKS = Object.entries(BANK_LABELS).map(([k, v]) => ({ value: k, label: v }));

export default function AccountForm({ f, onChange, onSave, onClose }) {
  const set = (k, v) => onChange({ ...f, [k]: v });

  return (
    <Modal title={f.id ? 'Editar Conta' : 'Nova Conta'} onClose={onClose}>
      <div className="form-group">
        <label className="form-label">Banco *</label>
        <select className="form-select" value={f.bank || ''} onChange={e => set('bank', e.target.value)}>
          {BANKS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
        </select>
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Agência</label>
          <input className="form-input" value={f.agency || ''} onChange={e => set('agency', e.target.value)} placeholder="0001" />
        </div>
        <div className="form-group">
          <label className="form-label">Número da Conta</label>
          <input className="form-input" value={f.accountNumber || ''} onChange={e => set('accountNumber', e.target.value)} placeholder="12345-6" />
        </div>
      </div>
      {!f.id && (
        <div className="form-group">
          <label className="form-label">Saldo Inicial (R$)</label>
          <CurrencyInput value={f.initialBalance || ''} onChange={v => set('initialBalance', v)} />
        </div>
      )}
      <div className="flex jce gap2" style={{ gap: 8, marginTop: 8 }}>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={onSave}>💾 Salvar</button>
      </div>
    </Modal>
  );
}
