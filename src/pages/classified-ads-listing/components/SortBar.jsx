import React from 'react';
import Icon from 'components/AppIcon';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'relevance', label: 'Relevancia' },
];

export default function SortBar({ sort, onSortChange, total, onFilterOpen }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <p className="text-sm font-caption text-muted-foreground">
        <span className="font-semibold text-foreground">{total}</span> avisos encontrados
      </p>
      <div className="flex items-center gap-2">
        {/* Mobile filter button */}
        <button
          onClick={onFilterOpen}
          className="md:hidden flex items-center gap-1.5 h-9 px-3 bg-card border border-border rounded-md text-sm font-caption text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Abrir filtros"
        >
          <Icon name="SlidersHorizontal" size={15} color="currentColor" />
          Filtros
        </button>
        <div className="flex items-center gap-2">
          <Icon name="ArrowUpDown" size={15} color="var(--color-secondary)" />
          <select
            value={sort}
            onChange={(e) => onSortChange(e?.target?.value)}
            className="h-9 pl-2 pr-7 text-sm font-caption text-foreground bg-card border border-border rounded-md appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Ordenar resultados"
          >
            {SORT_OPTIONS?.map((o) => (
              <option key={o?.value} value={o?.value}>{o?.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}