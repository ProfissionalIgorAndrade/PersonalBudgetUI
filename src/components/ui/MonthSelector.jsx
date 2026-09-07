import React, { useState, useRef, useEffect } from 'react';

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function addMonths(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function MonthSelector({ month, onChange }) {
  const [open, setOpen]       = useState(false);
  const [yearView, setYearView] = useState(() => Number(month.split('-')[0]));
  const ref = useRef(null);

  const [selYear, selMonthIdx] = month.split('-').map(Number);
  const nowStr    = new Date().toISOString().slice(0, 7);
  const nowYear   = new Date().getFullYear();
  const nowMonthIdx = new Date().getMonth() + 1;

  useEffect(() => {
    if (open) setYearView(selYear);
  }, [open, selYear]);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = (m) => {
    const ym = `${yearView}-${String(m + 1).padStart(2, '0')}`;
    onChange(ym);
    setOpen(false);
  };

  const isFuture = (_m) => false;

  const label = `${MONTHS_FULL[selMonthIdx - 1]} ${selYear}`;

  return (
    <div ref={ref} style={{ position: 'relative', userSelect: 'none' }}>
      {/* ── Trigger ──────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <button
          className="ms-arrow"
          onClick={() => onChange(addMonths(month, -1))}
          aria-label="Mês anterior"
        >‹</button>

        <button
          className="ms-trigger"
          onClick={() => setOpen(o => !o)}
          aria-haspopup="true"
          aria-expanded={open}
        >
          <span className="ms-trigger-icon">📅</span>
          <span className="ms-trigger-label">{label}</span>
          <span className="ms-trigger-caret" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
        </button>

        <button
          className="ms-arrow"
          onClick={() => onChange(addMonths(month, 1))}
          aria-label="Próximo mês"
        >›</button>
      </div>

      {/* ── Popover ──────────────────────────────── */}
      {open && (
        <div className="ms-popover">
          {/* Year row */}
          <div className="ms-year-row">
            <button
              className="ms-year-arrow"
              onClick={() => setYearView(y => y - 1)}
            >‹</button>
            <span className="ms-year-label">{yearView}</span>
            <button
              className="ms-year-arrow"
              onClick={() => setYearView(y => y + 1)}
            >›</button>
          </div>

          {/* Month grid */}
          <div className="ms-grid">
            {MONTHS_PT.map((name, i) => {
              const isSelected = yearView === selYear && i + 1 === selMonthIdx;
              const isToday    = yearView === nowYear  && i + 1 === nowMonthIdx;
              const disabled   = isFuture(i);
              return (
                <button
                  key={i}
                  className={`ms-cell${isSelected ? ' ms-selected' : ''}${isToday && !isSelected ? ' ms-today' : ''}`}
                  disabled={disabled}
                  onClick={() => !disabled && pick(i)}
                >
                  {name}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="ms-footer">
            <button
              className="ms-today-btn"
              onClick={() => { onChange(nowStr); setOpen(false); }}
            >
              Mês atual
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
