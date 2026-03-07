import React from 'react';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';

const RATING_OPTIONS = [
  { value: 'all', label: 'Todas las valoraciones' },
  { value: '4', label: '4+ estrellas' },
  { value: '3', label: '3+ estrellas' },
  { value: '2', label: '2+ estrellas' },
];

const RADIUS_OPTIONS = [
  { value: 'all', label: 'Toda la ciudad' },
  { value: '1', label: 'Menos de 1 km' },
  { value: '3', label: 'Menos de 3 km' },
  { value: '5', label: 'Menos de 5 km' },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevancia' },
  { value: 'rating', label: 'Mejor valorados' },
  { value: 'distance', label: 'Más cercanos' },
  { value: 'alphabetical', label: 'Alfabético' },
];

export default function FilterPanel({ filters, onFilterChange, onReset, resultCount, isMobile = false, onClose }) {
  const content = (
    <div className={`${isMobile ? 'p-4 flex flex-col gap-4' : 'flex flex-wrap items-center gap-3'}`}>
      {/* Rating */}
      <div className={`${isMobile ? '' : 'flex items-center gap-2'}`}>
        {isMobile && <label className="text-sm font-caption font-medium text-foreground mb-1 block">Valoración</label>}
        <select
          value={filters?.rating}
          onChange={(e) => onFilterChange('rating', e?.target?.value)}
          className="h-10 px-3 pr-8 text-sm font-caption text-foreground bg-card border border-border rounded-md appearance-none cursor-pointer focus:outline-none focus:border-primary w-full"
          aria-label="Filtrar por valoración"
        >
          {RATING_OPTIONS?.map(o => <option key={o?.value} value={o?.value}>{o?.label}</option>)}
        </select>
      </div>

      {/* Radius */}
      <div className={`${isMobile ? '' : 'flex items-center gap-2'}`}>
        {isMobile && <label className="text-sm font-caption font-medium text-foreground mb-1 block">Distancia</label>}
        <select
          value={filters?.radius}
          onChange={(e) => onFilterChange('radius', e?.target?.value)}
          className="h-10 px-3 pr-8 text-sm font-caption text-foreground bg-card border border-border rounded-md appearance-none cursor-pointer focus:outline-none focus:border-primary w-full"
          aria-label="Filtrar por distancia"
        >
          {RADIUS_OPTIONS?.map(o => <option key={o?.value} value={o?.value}>{o?.label}</option>)}
        </select>
      </div>

      {/* Sort */}
      <div className={`${isMobile ? '' : 'flex items-center gap-2'}`}>
        {isMobile && <label className="text-sm font-caption font-medium text-foreground mb-1 block">Ordenar por</label>}
        <select
          value={filters?.sort}
          onChange={(e) => onFilterChange('sort', e?.target?.value)}
          className="h-10 px-3 pr-8 text-sm font-caption text-foreground bg-card border border-border rounded-md appearance-none cursor-pointer focus:outline-none focus:border-primary w-full"
          aria-label="Ordenar resultados"
        >
          {SORT_OPTIONS?.map(o => <option key={o?.value} value={o?.value}>{o?.label}</option>)}
        </select>
      </div>

      {/* Open Now Toggle */}
      <button
        onClick={() => onFilterChange('openNow', !filters?.openNow)}
        className={`flex items-center gap-2 h-10 px-3 rounded-md border text-sm font-caption font-medium transition-all duration-250 whitespace-nowrap ${filters?.openNow ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-muted'}`}
        aria-pressed={filters?.openNow}
      >
        <Icon name="Clock" size={15} color="currentColor" />
        Abierto ahora
      </button>

      {/* Reset */}
      <button
        onClick={onReset}
        className="flex items-center gap-1.5 h-10 px-3 rounded-md text-sm font-caption text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-250 whitespace-nowrap"
      >
        <Icon name="RotateCcw" size={14} color="currentColor" />
        Limpiar
      </button>

      {isMobile && (
        <Button variant="default" fullWidth onClick={onClose} className="mt-2">
          Ver {resultCount} resultado{resultCount !== 1 ? 's' : ''}
        </Button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col" role="dialog" aria-modal="true" aria-label="Filtros">
        <div className="absolute inset-0 bg-foreground opacity-40" onClick={onClose} />
        <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-xl shadow-xl max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-4 border-b border-border sticky top-0 bg-card z-10">
            <h2 className="font-heading font-semibold text-base text-foreground">Filtros</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors">
              <Icon name="X" size={18} color="currentColor" />
            </button>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return content;
}