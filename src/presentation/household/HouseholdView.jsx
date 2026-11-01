import React from 'react';
import SectionScreen from '../shared/components/SectionScreen';
import ProfileView, { withDefaults } from '../profile/ProfileView';
import MembersView from '../members/MembersView';
import CategoriesView from '../categories/CategoriesView';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function Stack({ items, render }) {
  if (items.length === 0) return <span className="hh-media hh-media-empty" aria-hidden="true">＋</span>;
  return (
    <span className="hh-stack" aria-hidden="true" data-n={items.length}>
      {items.map(render)}
    </span>
  );
}

/**
 * "Meu Lar": Perfil, Família e Categorias numa tela só. O sub-menu mostra um
 * resumo de cada seção (seu e-mail, quantos membros, quantas categorias)
 * para achar o que procura sem abrir cada uma.
 */
export default function HouseholdView({
  section = 'profile', onSection,
  profile, onProfileChange, authSession = {}, notify, onLogout,
  members = [], mbrOps = {}, categories = [], catOps = {},
}) {
  const me       = withDefaults(profile, authSession);
  const myName   = me.nickname || me.firstName || 'Você';
  const initials = myName.slice(0, 2).toUpperCase();
  const income   = categories.filter(c => c.type === 'income').length;
  const expense  = categories.length - income;

  const sections = [
    {
      id: 'profile',
      label: 'Meu perfil',
      meta: me.email || 'Seus dados',
      short: 'Seus dados',
      media: <span className="hh-media hh-avatar" aria-hidden="true">{initials}</span>,
      render: () => (
        <ProfileView authSession={authSession} notify={notify} profile={profile} onProfileChange={onProfileChange} />
      ),
    },
    {
      id: 'family',
      label: 'Família',
      meta: plural(members.length, 'membro', 'membros'),
      media: (
        <Stack
          items={members.slice(0, 3)}
          render={m => <span key={m.id} className="hh-stack-chip hh-stack-person" style={{ '--c': m.color }}>{m.emoji}</span>}
        />
      ),
      render: () => <MembersView members={members} {...mbrOps} notify={notify} onLogout={onLogout} />,
    },
    {
      id: 'categories',
      label: 'Categorias',
      meta: `${plural(income, 'receita', 'receitas')} · ${plural(expense, 'despesa', 'despesas')}`,
      short: plural(categories.length, 'categoria', 'categorias'),
      media: (
        <Stack
          items={categories.slice(0, 3)}
          render={c => <span key={c.id} className="hh-stack-chip" style={{ '--c': c.color }}>{c.icon}</span>}
        />
      ),
      render: () => <CategoriesView categories={categories} {...catOps} />,
    },
  ];

  return (
    <SectionScreen
      view="household"
      title="Meu Lar"
      sub={`${myName}, a família e as categorias usadas nos lançamentos.`}
      navLabel="Seções de Meu Lar"
      sections={sections}
      active={section}
      onSection={onSection}
    />
  );
}
