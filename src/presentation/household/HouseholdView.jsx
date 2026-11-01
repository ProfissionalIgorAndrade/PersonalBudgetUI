import React, { useEffect, useRef } from 'react';
import { HOUSEHOLD_SECTIONS, hashFor } from '../../core/hooks/useHashView';
import ProfileView, { withDefaults } from '../profile/ProfileView';
import MembersView from '../members/MembersView';
import CategoriesView from '../categories/CategoriesView';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const LABELS = { profile: 'Meu perfil', family: 'Família', categories: 'Categorias' };

function Stack({ items, render }) {
  if (items.length === 0) return <span className="hh-media hh-media-empty" aria-hidden="true">＋</span>;
  return (
    <span className="hh-stack" aria-hidden="true" data-n={items.length}>
      {items.map(render)}
    </span>
  );
}

/**
 * "Meu Lar": Perfil, Família e Categorias numa tela só. Cada seção tem o
 * próprio endereço (#household/family) e um item no sub-menu com um resumo
 * do que há nela, para achar o que procura sem abrir cada uma.
 *
 * As três seções ficam montadas e só a ativa aparece: trocar de seção não
 * recarrega convites nem perde uma edição de perfil pela metade.
 */
export default function HouseholdView({
  section = 'profile', onSection,
  profile, onProfileChange, authSession = {}, notify, onLogout,
  members = [], mbrOps = {}, categories = [], catOps = {},
}) {
  const active = HOUSEHOLD_SECTIONS.includes(section) ? section : 'profile';
  const focusNext = useRef(false);

  useEffect(() => {
    if (!focusNext.current) return;
    focusNext.current = false;
    document.getElementById(`hh-${active}-title`)?.focus();
  }, [active]);

  const go = (e, id) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; // nova aba: deixa o link agir
    e.preventDefault();
    if (id === active) return;
    focusNext.current = true;
    onSection?.(id);
  };

  const me       = withDefaults(profile, authSession);
  const myName   = me.nickname || me.firstName || 'Você';
  const initials = myName.slice(0, 2).toUpperCase();
  const income   = categories.filter(c => c.type === 'income').length;
  const expense  = categories.length - income;

  const items = [
    {
      id: 'profile',
      meta: me.email || 'Seus dados',
      short: 'Seus dados',
      media: <span className="hh-media hh-avatar" aria-hidden="true">{initials}</span>,
    },
    {
      id: 'family',
      meta: plural(members.length, 'membro', 'membros'),
      short: plural(members.length, 'membro', 'membros'),
      media: (
        <Stack
          items={members.slice(0, 3)}
          render={m => <span key={m.id} className="hh-stack-chip hh-stack-person" style={{ '--c': m.color }}>{m.emoji}</span>}
        />
      ),
    },
    {
      id: 'categories',
      meta: `${plural(income, 'receita', 'receitas')} · ${plural(expense, 'despesa', 'despesas')}`,
      short: plural(categories.length, 'categoria', 'categorias'),
      media: (
        <Stack
          items={categories.slice(0, 3)}
          render={c => <span key={c.id} className="hh-stack-chip" style={{ '--c': c.color }}>{c.icon}</span>}
        />
      ),
    },
  ];

  return (
    <div className="hh">
      <div className="page-header hh-header">
        <div>
          <h1 className="page-title">Meu Lar</h1>
          <p className="page-sub">{myName}, a família e as categorias usadas nos lançamentos.</p>
        </div>
      </div>

      <div className="hh-layout">
        <nav className="hh-nav" aria-label="Seções de Meu Lar">
          {items.map(it => (
            <a
              key={it.id}
              href={`#${hashFor('household', it.id)}`}
              className={`hh-nav-item${active === it.id ? ' active' : ''}`}
              aria-current={active === it.id ? 'page' : undefined}
              onClick={e => go(e, it.id)}
            >
              {it.media}
              <span className="hh-nav-text">
                <span className="hh-nav-label">{LABELS[it.id]}</span>
                <span className="hh-nav-meta hh-nav-meta-long">{it.meta}</span>
                <span className="hh-nav-meta hh-nav-meta-short" aria-hidden="true">{it.short}</span>
              </span>
            </a>
          ))}
        </nav>

        <div className="hh-panels">
          <section className="hh-panel" aria-labelledby="hh-profile-title" hidden={active !== 'profile'}>
            <ProfileView
              authSession={authSession}
              notify={notify}
              profile={profile}
              onProfileChange={onProfileChange}
            />
          </section>
          <section className="hh-panel" aria-labelledby="hh-family-title" hidden={active !== 'family'}>
            <MembersView members={members} {...mbrOps} notify={notify} onLogout={onLogout} />
          </section>
          <section className="hh-panel" aria-labelledby="hh-categories-title" hidden={active !== 'categories'}>
            <CategoriesView categories={categories} {...catOps} />
          </section>
        </div>
      </div>
    </div>
  );
}
