import React from 'react';
import Icon from 'components/AppIcon';

const BASE_CATEGORIES = [
  { value: '', label: 'Todas las categorías' },
  { value: 'church', label: 'Iglesia / Templo' },
  { value: 'courses', label: 'Cursos' },
  { value: 'meetups', label: 'Encuentros' },
  { value: 'other', label: 'Otro' },
];

export default function EventFilters({ filters, onChange, extraCategories = [] }) {
  // Merge base categories with any dynamic ones from the data
  const baseValues = new Set(BASE_CATEGORIES.map(c => c.value));
  const dynamicCategories = extraCategories?.filter(c => c && !baseValues?.has(c))?.map(c => ({ value: c, label: c?.charAt(0)?.toUpperCase() + c?.slice(1) }));
  const categories = [...BASE_CATEGORIES, ...dynamicCategories];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Category */}
      <div className="relative">
        <select
          value={filters?.category}
          onChange={e => onChange({ ...filters, category: e?.target?.value })}
          className="appearance-none pl-3 pr-8 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
        >
          {categories?.map(c => (
            <option key={c?.value} value={c?.value}>{c?.label}</option>
          ))}
        </select>
        <Icon name="ChevronDown" size={14} color="currentColor" className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
      </div>

      {/* Upcoming / Past toggle */}
      <div className="flex items-center bg-muted rounded-lg p-0.5">
        <button
          onClick={() => onChange({ ...filters, upcoming: true })}
          className={`px-3 py-1.5 text-sm rounded-md font-medium transition-all ${
            filters?.upcoming
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Próximos
        </button>
        <button
          onClick={() => onChange({ ...filters, upcoming: false })}
          className={`px-3 py-1.5 text-sm rounded-md font-medium transition-all ${
            !filters?.upcoming
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Pasados
        </button>
      </div>
    </div>
  );
}
