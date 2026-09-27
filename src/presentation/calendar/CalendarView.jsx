import React, { useState, useEffect, useCallback } from 'react';
import { getFinancialCalendar } from '../../data/repositories/calendarRepository';
import { normalizeTransaction } from '../../application/mappers/index';
import { R$ } from '../../core/utils/format';

// ─── Helpers de data ──────────────────────────────────────────────────────────

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                     'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DOW_LABELS  = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate(); // month é 1-based
}

function firstDowOfMonth(year, month) {
  return new Date(year, month - 1, 1).getDay(); // 0=Dom
}

function addMonths(ymStr, delta) {
  const [y, m] = ymStr.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function todayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ─── Normalização da resposta da API ─────────────────────────────────────────

function normalizeCalendarResponse(data) {
  if (!data) return null;
  const today = todayStr();
  return {
    openingBalance: data.openingBalance ?? 0,
    days: (data.days ?? []).map(d => {
      const dateStr = (d.date ?? '').slice(0, 10);  // "2026-09-27"
      return {
        date:             dateStr,
        isToday:          dateStr === today,
        isPast:           dateStr < today,
        transactions:     (d.transactions ?? []).map(normalizeTransaction),
        statements:       (d.statements ?? []).map(s => ({
          statementId:    s.statementId ?? s.StatementId,
          creditCardId:   s.creditCardId ?? s.CreditCardId,
          creditCardName: s.creditCardName ?? s.CreditCardName ?? 'Cartão',
          dueDate:        (s.dueDate ?? s.DueDate ?? '').slice(0, 10),
          totalAmount:    s.totalAmount ?? s.TotalAmount ?? 0,
          status:         s.status ?? s.Status ?? 'Open',
        })),
        projectedBalance: d.projectedBalance ?? null,
      };
    }),
  };
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function AmountBadge({ amount, type, status }) {
  const isIncome   = type === 'income';
  const isCanceled = status === 'cancelled';
  const color = isCanceled ? 'var(--muted)'
              : isIncome   ? 'var(--green)'
              : 'var(--red)';
  const sign  = isIncome ? '+' : '-';

  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      color,
      opacity: isCanceled ? 0.5 : 1,
    }}>
      {sign}{R$(Math.abs(amount))}
    </span>
  );
}

function StatementBadge({ statement }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 3,
      background: 'rgba(129,140,248,0.12)',
      border: '1px solid rgba(129,140,248,0.3)',
      borderRadius: 4,
      padding: '1px 4px',
      marginTop: 2,
    }}>
      <span style={{ fontSize: 10 }}>💳</span>
      <span style={{ fontSize: 10, color: '#818cf8', fontWeight: 600, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {statement.creditCardName}
      </span>
      <span style={{ fontSize: 10, color: '#f87171', fontWeight: 600, marginLeft: 2 }}>
        -{R$(statement.totalAmount)}
      </span>
    </div>
  );
}

function DayCell({ day, dayNum }) {
  if (!day) {
    // Célula vazia (fora do mês)
    return <div style={styles.emptyCell} />;
  }

  const hasContent = day.transactions.length > 0 || day.statements.length > 0;
  const totalIncome  = day.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = day.transactions.filter(t => t.type === 'expense' || t.type === 'savings').reduce((s, t) => s + t.amount, 0);
  const netDay       = totalIncome - totalExpense;

  const cellStyle = {
    ...styles.dayCell,
    ...(day.isToday  ? styles.today     : {}),
    ...(day.isPast   ? styles.pastDay   : {}),
  };

  // Mostra no máximo 3 lançamentos + indicador de mais
  const MAX_TX = 3;
  const visibleTx  = day.transactions.slice(0, MAX_TX);
  const hiddenCount = day.transactions.length - MAX_TX;

  return (
    <div style={cellStyle}>
      {/* Cabeçalho do dia */}
      <div style={styles.dayHeader}>
        <span style={{
          ...styles.dayNumber,
          ...(day.isToday ? styles.todayNumber : {}),
        }}>
          {dayNum}
        </span>
        {hasContent && netDay !== 0 && (
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            color: netDay > 0 ? 'var(--green)' : 'var(--red)',
            opacity: 0.8,
          }}>
            {netDay > 0 ? '+' : ''}{R$(netDay)}
          </span>
        )}
      </div>

      {/* Lançamentos */}
      <div style={styles.eventList}>
        {visibleTx.map(tx => (
          <div key={tx.id} style={styles.eventRow}>
            <span style={{
              fontSize: 10,
              color: tx.status === 'cancelled' ? 'var(--muted)'
                   : tx.type === 'income'      ? 'var(--green)'
                   : 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              opacity: tx.status === 'pending' ? 0.75 : 1,
              textDecoration: tx.status === 'cancelled' ? 'line-through' : 'none',
            }}>
              {tx.description || '—'}
            </span>
            <AmountBadge amount={tx.amount} type={tx.type} status={tx.status} />
          </div>
        ))}

        {hiddenCount > 0 && (
          <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>
            +{hiddenCount} mais
          </div>
        )}

        {/* Faturas de cartão */}
        {day.statements.map(st => (
          <StatementBadge key={st.statementId} statement={st} />
        ))}
      </div>

      {/* Saldo projetado */}
      {day.projectedBalance !== null && (
        <div style={styles.projectedBalance}>
          <span style={{
            color: day.projectedBalance >= 0 ? 'var(--primary)' : 'var(--red)',
            fontWeight: 600,
          }}>
            {R$(day.projectedBalance)}
          </span>
        </div>
      )}
    </div>
  );
}

function MonthSummary({ days, openingBalance }) {
  const allTx = days.flatMap(d => d.transactions);
  const totalIncome  = allTx.filter(t => t.type === 'income').reduce((s, t)  => s + t.amount, 0);
  const totalExpense = allTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalCards   = days.flatMap(d => d.statements).reduce((s, st) => s + st.totalAmount, 0);

  return (
    <div style={styles.summaryBar}>
      <SummaryPill label="Saldo Atual" value={R$(openingBalance)} color="var(--primary)" />
      <SummaryPill label="Receitas"   value={'+' + R$(totalIncome)}  color="var(--green)" />
      <SummaryPill label="Despesas"   value={'-' + R$(totalExpense)} color="var(--red)"   />
      {totalCards > 0 && (
        <SummaryPill label="Faturas"  value={'-' + R$(totalCards)}   color="#818cf8"      />
      )}
      <SummaryPill
        label="Balanço do Mês"
        value={(totalIncome - totalExpense >= 0 ? '+' : '') + R$(totalIncome - totalExpense)}
        color={totalIncome - totalExpense >= 0 ? 'var(--green)' : 'var(--red)'}
      />
    </div>
  );
}

function SummaryPill({ label, value, color }) {
  return (
    <div style={styles.summaryPill}>
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CalendarView() {
  const now        = new Date();
  const initMonth  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [activeMonth, setActiveMonth] = useState(initMonth);
  const [calData,     setCalData]     = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);

  const fetchCalendar = useCallback(async (ym) => {
    const [y, m] = ym.split('-').map(Number);
    const dim    = daysInMonth(y, m);
    const from   = `${ym}-01`;
    const to     = `${ym}-${String(dim).padStart(2, '0')}`;

    setLoading(true);
    setError(null);
    try {
      const raw = await getFinancialCalendar(from, to);
      setCalData(normalizeCalendarResponse(raw));
    } catch (e) {
      setError(e.message || 'Erro ao carregar o calendário.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar(activeMonth);
  }, [activeMonth, fetchCalendar]);

  const [year, month] = activeMonth.split('-').map(Number);
  const dim    = daysInMonth(year, month);
  const firstDow = firstDowOfMonth(year, month);  // 0=Dom

  // Mapa: "YYYY-MM-DD" → dados do dia
  const dayMap = {};
  (calData?.days ?? []).forEach(d => { dayMap[d.date] = d; });

  // Gera grid: células vazias + dias do mês
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ dayNum: d, data: dayMap[key] ?? null });
  }
  // Completa a última semana com células vazias
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={styles.page}>
      {/* Cabeçalho */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h2 style={styles.title}>📅 Calendário Financeiro</h2>
          <p style={styles.subtitle}>Seus lançamentos e projeções organizados por dia</p>
        </div>
        <div style={styles.navControls}>
          <button style={styles.navBtn} onClick={() => setActiveMonth(m => addMonths(m, -1))}>‹</button>
          <span style={styles.monthLabel}>
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button style={styles.navBtn} onClick={() => setActiveMonth(m => addMonths(m, 1))}>›</button>
          <button style={styles.todayBtn} onClick={() => setActiveMonth(initMonth)}>Hoje</button>
        </div>
      </div>

      {/* Barra de resumo */}
      {calData && !loading && (
        <MonthSummary days={calData.days} openingBalance={calData.openingBalance} />
      )}

      {/* Legenda */}
      <div style={styles.legend}>
        <span style={styles.legendItem}><span style={{ color: 'var(--green)' }}>●</span> Receita</span>
        <span style={styles.legendItem}><span style={{ color: 'var(--red)' }}>●</span> Despesa</span>
        <span style={styles.legendItem}><span style={{ color: '#818cf8' }}>●</span> Fatura de cartão</span>
        <span style={styles.legendItem}><span style={{ color: 'var(--muted)' }}>●</span> Pendente (opaco)</span>
        <span style={styles.legendItem}><span style={{ color: 'var(--primary)' }}>◆</span> Saldo projetado</span>
      </div>

      {/* Conteúdo principal */}
      {loading && (
        <div style={styles.loadingBox}>
          <div style={styles.spinner} />
          <span style={{ color: 'var(--muted)', fontSize: 14 }}>Carregando calendário...</span>
        </div>
      )}

      {error && !loading && (
        <div style={styles.errorBox}>{error}</div>
      )}

      {!loading && !error && (
        <>
          {/* Grade — cabeçalho dos dias da semana */}
          <div style={styles.grid}>
            {DOW_LABELS.map(d => (
              <div key={d} style={styles.dowHeader}>{d}</div>
            ))}

            {/* Células dos dias */}
            {cells.map((cell, i) => {
              if (cell === null) return <div key={`empty-${i}`} style={styles.emptyCell} />;
              return (
                <DayCell
                  key={cell.dayNum}
                  day={cell.data}
                  dayNum={cell.dayNum}
                />
              );
            })}
          </div>

          {/* Aviso de timezone */}
          <p style={styles.tzNote}>
            ⚠️ Datas exibidas em UTC. Lançamentos criados após 21h (horário de Brasília) podem aparecer no dia seguinte.
          </p>
        </>
      )}
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = {
  page: {
    padding: '24px 28px',
    maxWidth: 1200,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text)',
  },
  subtitle: {
    margin: 0,
    fontSize: 13,
    color: 'var(--muted)',
  },
  navControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text)',
    fontSize: 18,
    width: 32,
    height: 32,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    padding: 0,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text)',
    minWidth: 160,
    textAlign: 'center',
  },
  todayBtn: {
    background: 'var(--primary)',
    border: 'none',
    borderRadius: 6,
    color: '#000',
    fontSize: 12,
    fontWeight: 600,
    padding: '5px 12px',
    cursor: 'pointer',
  },
  summaryBar: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  summaryPill: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '8px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 110,
  },
  legend: {
    display: 'flex',
    gap: 14,
    flexWrap: 'wrap',
    marginBottom: 14,
    fontSize: 11,
    color: 'var(--muted)',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 2,
    background: 'var(--border)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  dowHeader: {
    background: 'var(--surface)',
    padding: '6px 0',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--muted)',
    letterSpacing: '0.05em',
  },
  emptyCell: {
    background: 'var(--bg)',
    minHeight: 90,
  },
  dayCell: {
    background: 'var(--surface)',
    minHeight: 90,
    padding: '5px 6px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    transition: 'background 0.15s',
    cursor: 'default',
  },
  today: {
    background: 'rgba(45,212,191,0.07)',
    outline: '1.5px solid var(--primary)',
    outlineOffset: -1.5,
  },
  pastDay: {
    opacity: 0.65,
  },
  dayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--muted)',
  },
  todayNumber: {
    background: 'var(--primary)',
    color: '#000',
    borderRadius: '50%',
    width: 20,
    height: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
  },
  eventList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flex: 1,
  },
  eventRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  projectedBalance: {
    marginTop: 4,
    paddingTop: 3,
    borderTop: '1px solid var(--border)',
    textAlign: 'right',
    fontSize: 10,
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '60px 0',
  },
  spinner: {
    width: 28,
    height: 28,
    border: '3px solid var(--border)',
    borderTop: '3px solid var(--primary)',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  errorBox: {
    background: 'rgba(248,113,113,0.1)',
    border: '1px solid rgba(248,113,113,0.3)',
    borderRadius: 8,
    padding: '16px 20px',
    color: 'var(--red)',
    fontSize: 14,
  },
  tzNote: {
    marginTop: 10,
    fontSize: 11,
    color: 'var(--muted)',
    opacity: 0.7,
  },
};
