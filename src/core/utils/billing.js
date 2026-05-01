export const getFaturaMonth = (dateStr, closingDay) => {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T12:00');
  if (d.getDate() > closingDay) {
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return next.toISOString().slice(0, 7);
  }
  return dateStr.slice(0, 7);
};

export const currentFaturaMonth = (closingDay) => {
  const now  = new Date();
  const base = now.getDate() > closingDay
    ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  return base.toISOString().slice(0, 7);
};

export const getFaturaMonths = (closingDay, count = 6) => {
  const now      = new Date();
  const todayDay = now.getDate();
  const base     = todayDay > closingDay
    ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    return d.toISOString().slice(0, 7);
  });
};
