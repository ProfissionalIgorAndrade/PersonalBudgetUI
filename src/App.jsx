import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import './styles/global.css';

import { useLocalStorage }   from './core/hooks/useLocalStorage';
import { useHashView }       from './core/hooks/useHashView';
import { curMonth }          from './core/utils/format';
import { useNotify }         from './application/hooks/useNotify';
import { useAppData }        from './application/hooks/useAppData';
import { useAuth }           from './application/hooks/useAuth';

import Sidebar               from './presentation/shared/components/Sidebar';
import Toast                 from './presentation/shared/components/Toast';
import LoadingOverlay        from './presentation/shared/components/LoadingOverlay';
import AuthView              from './presentation/auth/AuthView';
import DashboardView         from './presentation/dashboard/DashboardView';
import TransactionsView      from './presentation/transactions/TransactionsView';
import CardsView             from './presentation/cards/CardsView';
import AccountsView          from './presentation/accounts/AccountsView';
import MembersView           from './presentation/members/MembersView';
import CategoriesView        from './presentation/categories/CategoriesView';
import ProfileView           from './presentation/profile/ProfileView';

const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.16, ease: [0.4, 0, 0.2, 1] } },
};

export default function App() {
  const { toast, notify, clearToast } = useNotify();
  const { authSession, login, signup, logout } = useAuth();
  const {
    loading, transactions, accounts, categories, cards, members,
    transactionsReloadGeneration,
    loadAll, loadTx, clearData,
    txOps, accOps, catOps, cardOps, mbrOps,
  } = useAppData(notify);

  const [view,        setView]        = useHashView('dashboard');
  const [theme,       setTheme]       = useLocalStorage('pb_theme', 'dark');
  const [activeMonth, setActiveMonth] = useLocalStorage('pb_active_month', curMonth());
  const [profile]                     = useLocalStorage('pb_profile', {});

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
          onLogin={async (creds) => {
            await login(creds);
          }}
          onSignup={async (data) => {
            await signup(data);
          }}
        />
        {toast && <Toast msg={toast.msg} type={toast.type} onClose={clearToast} />}
      </>
    );
  }

  const data = { transactions, categories, members, accounts, cards };

  const views = {
    dashboard:    <DashboardView    data={data} setView={setView} activeMonth={activeMonth} setActiveMonth={setActiveMonth} />,
    transactions: <TransactionsView data={data} {...txOps} activeMonth={activeMonth} setActiveMonth={setActiveMonth} />,
    cards:        <CardsView        cards={cards} members={members} transactions={transactions} categories={categories} accounts={accounts}
                                    {...cardOps} onEditTx={txOps.onEdit} onDeleteTx={txOps.onDelete}
                                    activeMonth={activeMonth} setActiveMonth={setActiveMonth}
                                    notify={notify} loadTransactions={loadTx} />,
    accounts:     <AccountsView     accounts={accounts} members={members} categories={categories} cards={cards}
                                    {...accOps} onEditTx={txOps.onEdit} onDeleteTx={txOps.onDelete} onUpdateStatus={txOps.onUpdateStatus}
                                    notify={notify} transactionsReloadGeneration={transactionsReloadGeneration}
                                    activeMonth={activeMonth} setActiveMonth={setActiveMonth} />,
    members:      <MembersView      members={members} {...mbrOps} notify={notify} onLogout={handleLogout} />,
    categories:   <CategoriesView   categories={categories} {...catOps} />,
    profile:      <ProfileView      authSession={authSession} />,
  };

  return (
    <div className="layout">
      <Sidebar
        view={view} setView={setView}
        theme={theme} setTheme={setTheme}
        profile={profile}
        authSession={authSession}
        onLogout={handleLogout}
      />
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
