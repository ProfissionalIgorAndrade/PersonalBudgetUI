let seq = 0;

/** Lançamento mínimo no formato normalizado pelo app. */
export const tx = (over = {}) => ({
  id: `t${++seq}`,
  description: 'Lançamento',
  amount: 100,
  date: '2026-06-10',
  type: 'expense',
  recurrence: 'variable',
  categoryId: 'c-mercado',
  cardId: '',
  statementMonth: null,
  statementYear: null,
  ...over,
});

export const box = (over = {}) => ({
  id: `b${++seq}`, name: 'Reserva', kind: 'savings', balance: 0, savingsGoal: null, ...over,
});

export const categories = [
  { id: 'c-mercado', name: 'Mercado', icon: '🛒' },
  { id: 'c-lazer', name: 'Lazer', icon: '🎮' },
  { id: 'c-moradia', name: 'Moradia', icon: '🏠' },
];
