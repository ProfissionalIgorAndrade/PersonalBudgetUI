import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import './styles/global.css';
import './styles/mobile.css';

import { useLocalStorage }   from './core/hooks/useLocalStorage';
import { useHashView }       from './core/hooks/useHashView';
import { curMonth }          from './core/utils/format';
import { useNotify }         from './application/hooks/useNotify';
import { useAppData }        from './application/hooks/useAppData';
import { useAuth }           from './application/hooks/useAuth';
import { redirectToDashboardAfter } from './application/authRedirect';

import Sidebar               from './presentation/shared/components/Sidebar';
import MobileTopBar          from './presentation/shared/components/MobileTopBar';
import Toast                 from './presentation/shared/components/Toast';
import LoadingOverlay        from './presentation/shared/components/LoadingOverlay';
import AuthView              from './presentation/auth/AuthView';
import DashboardView         from './presentation/dashboard/DashboardView';
import TransactionsView      from './presentation/transactions/TransactionsView';
import CardsView             from './presentation/cards/CardsView';
import AccountsView          from './presentation/accounts/AccountsView';
import SavingsView           from './presentation/savings/SavingsView';
import HouseholdView         from './presentation/household/HouseholdView';
import PlanningView          from './presentation/planning/PlanningView';

const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.16, ease: [0.4, 0, 0.2, 1] } },
};

export default function App() {
  const { toast, notify, clearToast } = useNotify();
  const { authSession, login, signup, logout, expired, clearExpired } = useAuth();
  const {
    loading, transactions, savingsTransactions, savingsEvents, accounts, categories, cards, members,
    budgets,
    transactionsReloadGeneration,
    loadAll, loadTx, loadBudgets, clearData,
    txOps, accOps, catOps, cardOps, mbrOps, budgetOps,
  } = useAppData(notify);

  const [view, setView, section]      = useHashView('dashboard');
  const [theme,       setTheme]       = useLocalStorage('pb_theme', 'dark');
  const [activeMonth, setActiveMonth] = useLocalStorage('pb_active_month', curMonth());
  const [profile,     setProfile]     = useLocalStorage('pb_profile', {});
  // Gaveta de navegação das telas estreitas; no desktop a sidebar é fixa.
  const [menuOpen,    setMenuOpen]    = useState(false);

  useEffect(() => { setMenuOpen(false); }, [view]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('menu-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('menu-open');
    };
  }, [menuOpen]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (authSession) loadAll();
  }, [authSession]);

  const handleLogout = () => {
    logout(clearData);
    setView('dashboard');
  };

  if (!authSession) {
    return (
      <>
        <AuthView
          notice={expired ? 'Sua sessão expirou. Entre novamente para continuar.' : ''}
          onDismissNotice={clearExpired}
          onLogin={redirectToDashboardAfter(login, setView)}
          onSignup={redirectToDashboardAfter(signup, setView)}
        />
        {toast && <Toast msg={toast.msg} type={toast.type} onClose={clearToast} />}
      </>
    );
  }

  const data = { transactions, categories, members, accounts, cards, budgets };

  const views = {
    dashboard:    <DashboardView    data={data} setView={setView} activeMonth={activeMonth} setActiveMonth={setActiveMonth} theme={theme} loadBudgets={loadBudgets} />,
    planning:     <PlanningView     section={section} onSection={(s) => setView('planning', s)}
                                    data={data} savingsTransactions={savingsTransactions} theme={theme}
                                    activeMonth={activeMonth} setActiveMonth={setActiveMonth}
                                    budgets={budgets} loadBudgets={loadBudgets} budgetOps={budgetOps}
                                    authSession={authSession} notify={notify} />,
    transactions: <TransactionsView data={data} {...txOps} activeMonth={activeMonth} setActiveMonth={setActiveMonth}
                                    onImportStatement={txOps.onImportStatement} />,
    cards:        <CardsView        cards={cards} members={members} transactions={transactions} categories={categories} accounts={accounts}
                                    {...cardOps} onEditTx={txOps.onEdit} onDeleteTx={txOps.onDelete} onBatchDeleteTx={txOps.onBatchDelete}
                                    onToggleReviewed={txOps.onToggleReviewed} onReviewStatement={cardOps.onReviewStatement}
                                    activeMonth={activeMonth} setActiveMonth={setActiveMonth}
                                    notify={notify} loadTransactions={loadTx} />,
    accounts:     <AccountsView     accounts={accounts} members={members} categories={categories} cards={cards} transactions={transactions}
                                    {...accOps} onEditTx={txOps.onEdit} onDeleteTx={txOps.onDelete} onBatchDeleteTx={txOps.onBatchDelete}
                                    onToggleReviewed={txOps.onToggleReviewed}
                                    notify={notify} transactionsReloadGeneration={transactionsReloadGeneration}
                                    activeMonth={activeMonth} setActiveMonth={setActiveMonth} />,
    savings:      <SavingsView      accounts={accounts} members={members} movements={savingsTransactions} events={savingsEvents} theme={theme}
                                    onCreateBox={accOps.onCreateSavingsBox} onRenameBox={accOps.onRenameSavingsBox}
                                    onSetGoal={accOps.onSetSavingsGoal} onDeleteBox={accOps.onDeleteSavingsBox}
                                    onMove={accOps.onMoveSavings} notify={notify} />,
    household:    <HouseholdView    section={section} onSection={(s) => setView('household', s)}
                                    profile={profile} onProfileChange={setProfile} authSession={authSession}
                                    members={members} mbrOps={mbrOps} categories={categories} catOps={catOps}
                                    notify={notify} onLogout={handleLogout} />,
  };

  return (
    <div className="layout">
      <MobileTopBar view={view} menuOpen={menuOpen} onToggleMenu={() => setMenuOpen(o => !o)} />
      <Sidebar
        view={view} section={section} setView={setView}
        theme={theme} setTheme={setTheme}
        profile={profile}
        authSession={authSession}
        onLogout={handleLogout}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
      <main className="main">
        {loading && <LoadingOverlay />}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={view} variants={pageVariants} initial="initial" animate="animate" exit="exit">
            {views[view] || views.dashboard}
          </motion.div>
        </AnimatePresence>
      </main>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={clearToast} />}
    </div>
  );
}
