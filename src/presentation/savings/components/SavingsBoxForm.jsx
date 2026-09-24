import React from 'react';
import Modal from '../../shared/components/Modal';
import { accountLabel } from '../../../application/mappers/index';

/** Cria ou renomeia uma caixinha. */
export default function SavingsBoxForm({ f, accounts, members, onChange, onSave, onClose }) {
  const set = (k, v) => onChange({ ...f, [k]: v });
  const isEdit = Boolean(f.id);
  const canSave = Boolean(String(f.name || '').trim()) && (isEdit || Boolean(f.parentAccountId));

  return (
    <Modal title={isEdit ? 'Renomear Caixinha' : 'Nova Caixinha'} onClose={onClose} confirmOnOverlay>
      <form onSubmit={e => { e.preventDefault(); if (canSave) onSave(); }}>
        <div className="form-group">
          <label className="form-label">Nome *</label>
          <input
            className="form-input"
            required
            autoFocus
            maxLength={80}
            placeholder="Ex: Reserva de emergência, Viagem"
            value={f.name || ''}
            onChange={e => set('name', e.target.value)}
          />
        </div>

        {/* A conta de origem é imutável: mover uma caixinha entre contas seria
            mover o dinheiro junto, e isso é um resgate seguido de um guardar,
            não uma edição. */}
        {!isEdit && (
          <div className="form-group">
            <label className="form-label">Conta de origem *</label>
            <select className="form-select" required value={f.parentAccountId || ''}
              onChange={e => set('parentAccountId', e.target.value)}>
              <option value="">— Selecione —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{accountLabel(a, members)}</option>)}
            </select>
            <p className="txxs tmuted" style={{ marginTop: 6, lineHeight: 1.5 }}>
              A caixinha começa zerada. Use Guardar para transferir dinheiro para ela.
            </p>
          </div>
        )}

        <div className="flex jce gap2" style={{ gap: 8, marginTop: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={!canSave}>💾 Salvar</button>
        </div>
      </form>
    </Modal>
  );
}
