import React from 'react';
import Icon from 'components/AppIcon';

const CATEGORIES = [
  { value: 'all', label: 'Todas' },
  { value: 'supermercados', label: 'Supermercados' },
  { value: 'farmacias', label: 'Farmacias' },
  { value: 'restaurantes', label: 'Restaurantes' },
  { value: 'iglesias-templos', label: 'Iglesias' },
  { value: 'church', label: 'Iglesia' },
  { value: 'courses', label: 'Cursos' },
  { value: 'meetups', label: 'Encuentros' },
  { value: 'other', label: 'Otro' },
];

const BUSINESS_CATEGORIES = [
  { value: 'all', label: 'Todas' },
  { value: 'supermercados', label: 'Supermercados' },
  { value: 'farmacias', label: 'Farmacias' },
  { value: 'restaurantes', label: 'Restaurantes' },
  { value: 'iglesias-templos', label: 'Iglesias' },
  { value: 'ferreterias', label: 'Ferreterías' },
];

const EVENT_CATEGORIES = [
  { value: 'all', label: 'Todas' },
  { value: 'church', label: 'Iglesia' },
  { value: 'courses', label: 'Cursos' },
  { value: 'meetups', label: 'Encuentros' },
  { value: 'other', label: 'Otro' },
];

export default function MapSearchBar({
  search,
  onSearchChange,
  showBusinesses,
  showEvents,
  showCommunity,
  onToggleBusinesses,
  onToggleEvents,
  onToggleCommunity,
  category,
  onCategoryChange,
}) {
  const categoryOptions = showBusinesses && !showEvents
    ? BUSINESS_CATEGORIES
    : !showBusinesses && showEvents
    ? EVENT_CATEGORIES
    : CATEGORIES;

  return (
    <div
      className="absolute top-0 left-0 right-0 z-[400] px-3 pt-3 pb-2"
      style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.98) 80%, transparent)' }}
    >
      {/* Search Input */}
      <div className="relative mb-2">
        <Icon
          name="Search"
          size={16}
          color="var(--color-muted-foreground)"
          className="absolute left-3 top-1/2 -translate-y-1/2"
        />
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange?.(e?.target?.value)}
          placeholder="Buscar negocios o eventos..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-border rounded-xl bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
        />
        {search && (
          <button
            onClick={() => onSearchChange?.('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors"
          >
            <Icon name="X" size={14} color="var(--color-muted-foreground)" />
          </button>
        )}
      </div>

      {/* Layer Toggles + Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {/* Negocios toggle */}
        <button
          onClick={onToggleBusinesses}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
            showBusinesses
              ? 'text-white border-transparent' :'border-border text-muted-foreground bg-card hover:bg-muted'
          }`}
          style={showBusinesses ? { background: '#2563eb' } : {}}
        >
          <div className="w-2 h-2 rounded-full" style={{ background: showBusinesses ? 'white' : '#2563eb' }} />
          Negocios
        </button>

        {/* Eventos toggle */}
        <button
          onClick={onToggleEvents}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
            showEvents
              ? 'text-white border-transparent' :'border-border text-muted-foreground bg-card hover:bg-muted'
          }`}
          style={showEvents ? { background: '#ea580c' } : {}}
        >
          <div className="w-2 h-2 rounded-full" style={{ background: showEvents ? 'white' : '#ea580c' }} />
          Eventos
        </button>

        {/* Comunidad toggle */}
        <button
          onClick={onToggleCommunity}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
            showCommunity
              ? 'text-white border-transparent' :'border-border text-muted-foreground bg-card hover:bg-muted'
          }`}
          style={showCommunity ? { background: '#7c3aed' } : {}}
        >
          <div className="w-2 h-2 rounded-full" style={{ background: showCommunity ? 'white' : '#7c3aed' }} />
          Comunidad
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-border flex-shrink-0" />

        {/* Category chips */}
        {categoryOptions?.map(cat => (
          <button
            key={cat?.value}
            onClick={() => onCategoryChange?.(cat?.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
              category === cat?.value
                ? 'text-white border-transparent' :'border-border text-muted-foreground bg-card hover:bg-muted'
            }`}
            style={category === cat?.value ? { background: 'var(--color-primary)' } : {}}
          >
            {cat?.label}
          </button>
        ))}
      </div>
    </div>
  );
}
