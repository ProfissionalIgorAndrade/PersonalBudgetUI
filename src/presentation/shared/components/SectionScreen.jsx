import React, { useEffect, useRef } from 'react';
import { hashFor } from '../../../core/hooks/useHashView';

/**
 * Tela com sub-menu (Meu Lar, Planejamento): título da tela, sub-menu com um
 * resumo de cada seção e a seção ativa ao lado. Abaixo de 1100px o sub-menu
 * vira abas presas no topo (estilos .hh-* em global.css e mobile.css).
 *
 * Cada seção tem o próprio endereço (`#<view>/<id>`). Todas ficam montadas e
 * só a ativa aparece: trocar de seção não perde uma edição pela metade nem
 * refaz o que já foi carregado. Ao trocar pelo sub-menu, o foco vai para o
 * título da seção (`hh-<id>-title`, que a seção põe no seu h2).
 *
 * `sections`: [{ id, label, shortLabel, meta, short, media, render }]; os
 * campos "short" são os das abas do celular.
 */
export default function SectionScreen({ view, title, sub, navLabel, sections, active, onSection }) {
  const current = sections.some(s => s.id === active) ? active : sections[0].id;
  const focusNext = useRef(false);

  useEffect(() => {
    if (!focusNext.current) return;
    focusNext.current = false;
    document.getElementById(`hh-${current}-title`)?.focus();
  }, [current]);

  const go = (e, id) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; // nova aba: deixa o link agir
    e.preventDefault();
    if (id === current) return;
    focusNext.current = true;
    onSection?.(id);
  };

  return (
    <div className="hh">
      <div className="page-header hh-header">
        <div>
          <h1 className="page-title">{title}</h1>
          {sub && <p className="page-sub">{sub}</p>}
        </div>
      </div>

      <div className="hh-layout">
        <nav className="hh-nav" aria-label={navLabel}>
          {sections.map(s => (
            <a
              key={s.id}
              href={`#${hashFor(view, s.id)}`}
              className={`hh-nav-item${current === s.id ? ' active' : ''}`}
              aria-current={current === s.id ? 'page' : undefined}
              onClick={e => go(e, s.id)}
            >
              {s.media}
              <span className="hh-nav-text">
                <span className="hh-nav-label">
                  <span className="hh-nav-label-long">{s.label}</span>
                  <span className="hh-nav-label-short" aria-hidden="true">{s.shortLabel ?? s.label}</span>
                </span>
                <span className="hh-nav-meta hh-nav-meta-long">{s.meta}</span>
                <span className="hh-nav-meta hh-nav-meta-short" aria-hidden="true">{s.short ?? s.meta}</span>
              </span>
            </a>
          ))}
        </nav>

        <div className="hh-panels">
          {sections.map(s => (
            <section key={s.id} className="hh-panel" aria-labelledby={`hh-${s.id}-title`} hidden={current !== s.id}>
              {s.render()}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
