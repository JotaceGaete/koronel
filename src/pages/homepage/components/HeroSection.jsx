import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import SmartSearchInput from 'components/ui/SmartSearchInput';

const QUICK_CATEGORIES = [
  { label: 'Dentistas', term: 'Dentistas' },
  { label: 'Mecánicos', term: 'Mecánicos' },
  { label: 'Veterinarias', term: 'Veterinarias' },
  { label: 'Restaurantes', term: 'Restaurantes' },
  { label: 'Farmacias', term: 'Farmacias' },
];

export default function HeroSection() {
  return (
    <section
      className="relative w-full py-3 px-4 sm:py-4 md:py-6 lg:py-8 md:px-6 lg:px-8 border-b border-border/60"
      style={{ background: 'var(--color-muted)' }}
    >
      <div className="relative max-w-3xl mx-auto">
        {/* 1. Buscador inteligente: sugerencias en tiempo real */}
        <div className="w-full mb-3 sm:mb-4">
          <SmartSearchInput placeholder="Buscar en Coronel: negocios, categorías o dirección..." />
        </div>

        {/* 2. Título corto, discreto */}
        <h1 className="font-heading font-semibold text-sm sm:text-base text-muted-foreground text-center mb-3 sm:mb-4">
          Negocios y servicios en Coronel
        </h1>

        {/* 3. Categorías rápidas: 4 visibles en móvil, scroll horizontal */}
        <div
          className="flex gap-2 overflow-x-auto overflow-y-hidden pb-0.5 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:justify-center scrollbar-hide snap-x snap-mandatory"
          style={{ WebkitOverflowScrolling: 'touch' }}
          aria-label="Categorías rápidas"
        >
          {QUICK_CATEGORIES.map((link) => (
            <Link
              key={link.label}
              to={`/directorio-negocios?q=${encodeURIComponent(link.term)}`}
              className="shrink-0 snap-start min-h-[40px] min-w-[72px] md:min-w-0 inline-flex items-center justify-center px-3 py-2 rounded-full text-xs font-caption font-medium bg-card text-foreground border border-border hover:bg-muted hover:border-primary/30 active:scale-[0.98] transition-all"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Escritorio: subtítulo opcional */}
        <p className="hidden md:block text-center text-xs text-muted-foreground mt-3">
          Directorio local en un solo lugar
        </p>
      </div>
    </section>
  );
}