import React from 'react';
import Icon from 'components/AppIcon';

const SECTORS = ['Centro', 'Lagunillas', 'Schwager', 'Puchoco', 'Las Higueras', 'Punta de Parra', 'Otro'];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'most_voted', label: 'Más votados' },
  { value: 'unanswered', label: 'Sin respuesta' },
];

export default function CommunityFilters({ search, onSearchChange, sector, onSectorChange, sort, onSortChange }) {
  return (
    <div className="space-y-4">
      {/* Search + Sort row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
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
            placeholder="Buscar preguntas..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button
              onClick={() => onSearchChange?.('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted"
            >
              <Icon name="X" size={14} color="var(--color-muted-foreground)" />
            </button>
          )}
        </div>
        <select
          value={sort}
          onChange={e => onSortChange?.(e?.target?.value)}
          className="px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[160px]"
        >
          {SORT_OPTIONS?.map(opt => (
            <option key={opt?.value} value={opt?.value}>{opt?.label}</option>
          ))}
        </select>
      </div>

      {/* Sector chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSectorChange?.('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
            sector === 'all' || !sector ?'text-white border-transparent' :'border-border text-muted-foreground bg-card hover:bg-muted'
          }`}
          style={sector === 'all' || !sector ? { background: 'var(--color-primary)' } : {}}
        >
          Todos los sectores
        </button>
        {SECTORS?.map(s => (
          <button
            key={s}
            onClick={() => onSectorChange?.(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
              sector === s
                ? 'text-white border-transparent' :'border-border text-muted-foreground bg-card hover:bg-muted'
            }`}
            style={sector === s ? { background: 'var(--color-primary)' } : {}}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
