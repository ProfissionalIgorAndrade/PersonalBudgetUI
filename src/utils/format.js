export const R$ = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export const fdate = (d) =>
  d ? new Date(d + 'T12:00').toLocaleDateString('pt-BR') : '';

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

export const curMonth = () => new Date().toISOString().slice(0, 7);

export const monthLabel = (m) => {
  const [y, mo] = m.split('-');
  return (
    ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][+mo - 1] +
    '/' + y.slice(2)
  );
};
