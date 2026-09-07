import React, { useState } from 'react';
import { uid } from '../../utils/format';
import { COLORS, ICONS } from '../../constants';
import Modal from '../ui/Modal';
import ColorPick from '../ui/ColorPick';

function Group({ title, cats, type, onEdit, onDelete, onAddForType }) {
  return (
    <div className="card mb4" style={{ marginBottom: 14 }}>
      <div className="flex jcb aic mb3" style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title} <span className="tmuted" style={{ fontWeight: 400 }}>({cats.length})</span></h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 8 }}>
        {cats.map(c => (
          <div key={c.id} className="card-sm flex aic" style={{ gap: 9, border: `1px solid ${c.color}33`, padding: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: c.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{c.icon}</div>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{c.name}</span>
            <div className="flex gap2" style={{ gap: 3 }}>
              <button className="btn-icon" style={{ padding: '3px 6px', fontSize: 11 }} onClick={() => onEdit(c)}>✏️</button>
              <button className="btn-icon" style={{ padding: '3px 6px', fontSize: 11 }} onClick={() => onDelete(c.id)}>🗑️</button>
            </div>
          </div>
        ))}
        <div className="card-sm flex aic" style={{ gap: 9, border: '1px dashed var(--border)', padding: 10, cursor: 'pointer', opacity: .6 }} onClick={() => onAddForType(type)}>
          <span style={{ fontSize: 18 }}>＋</span><span style={{ fontSize: 12, color: 'var(--muted)' }}>Adicionar</span>
        </div>
      </div>
    </div>
  );
}

export default function Categories({ categories, onAdd, onEdit, onDelete }) {
  const [modal, setModal] = useState(null);
  const [f, setF] = useState({});
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const openNew = () => { setF({ name: '', icon: '📦', color: COLORS[Math.floor(Math.random() * COLORS.length)], type: 'expense' }); setModal('form'); };
  const openEdit = (c) => { setF(c); setModal('form'); };
  const openForType = (type) => { setF({ name: '', icon: '📦', color: COLORS[0], type }); setModal('form'); };
  const save = () => { const c = { ...f, id: f.id || uid() }; f.id ? onEdit(c) : onAdd(c); setModal(null); };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Categorias</h1><p className="page-sub">{categories.length} categorias</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Nova Categoria</button>
      </div>

      <Group title="Receitas" cats={categories.filter(c => c.type === 'income')} type="income" onEdit={openEdit} onDelete={onDelete} onAddForType={openForType} />
      <Group title="Despesas" cats={categories.filter(c => c.type === 'expense')} type="expense" onEdit={openEdit} onDelete={onDelete} onAddForType={openForType} />

      {modal === 'form' && (
        <Modal title={f.id ? 'Editar Categoria' : 'Nova Categoria'} onClose={() => setModal(null)}>
          <div className="form-group">
            <label className="form-label">Nome</label>
            <input className="form-input" value={f.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Alimentação" />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <div className="flex gap2" style={{ gap: 8 }}>
              {[['expense', '💸 Despesa'], ['income', '💰 Receita']].map(([k, v]) => (
                <button key={k} type="button" className={`btn ${f.type === k ? 'btn-primary' : 'btn-secondary'}`} onClick={() => set('type', k)}>{v}</button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Ícone</label>
            <div className="flex fw gap2" style={{ gap: 6, flexWrap: 'wrap' }}>
              {ICONS.map(ic => (
                <div key={ic} onClick={() => set('icon', ic)} style={{ fontSize: 22, cursor: 'pointer', padding: 5, borderRadius: 7, background: f.icon === ic ? 'var(--primary-dim)' : 'var(--surface2)', border: `2px solid ${f.icon === ic ? 'var(--primary)' : 'transparent'}` }}>{ic}</div>
              ))}
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
