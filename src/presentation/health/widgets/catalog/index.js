import HcCashflow from './HcCashflow';
import HcPace from './HcPace';
import HcWeekday from './HcWeekday';
import HcShare from './HcShare';
import HcTrend from './HcTrend';
import HcIncreases from './HcIncreases';
import { HcMemberExpense, HcMemberIncome } from './HcMembers';
import HcIncomeSources from './HcIncomeSources';
import HcInvoices from './HcInvoices';
import HcBalances from './HcBalances';
import HcBoxes from './HcBoxes';
import HcLatest from './HcLatest';
import HcReview from './HcReview';
import HcFixed from './HcFixed';
import HcInstallments from './HcInstallments';
import HcSubscriptions from './HcSubscriptions';
import HcRule from './HcRule';
import HcProjection from './HcProjection';

/**
 * Componente de cada widget do catálogo, pelo id do registro (layout.js).
 * Todos recebem o mesmo contexto: { transactions, accounts, cards, members,
 * categories, savingsTransactions, month, today }.
 */
export const CATALOG_COMPONENTS = {
  cashflow: HcCashflow,
  pace: HcPace,
  weekday: HcWeekday,
  share: HcShare,
  trend: HcTrend,
  increases: HcIncreases,
  'member-expense': HcMemberExpense,
  'member-income': HcMemberIncome,
  'income-sources': HcIncomeSources,
  invoices: HcInvoices,
  balances: HcBalances,
  boxes: HcBoxes,
  latest: HcLatest,
  review: HcReview,
  fixed: HcFixed,
  installments: HcInstallments,
  subscriptions: HcSubscriptions,
  rule: HcRule,
  projection: HcProjection,
};
