import React from 'react';
import { jobService } from '../../../services/jobService';

export default function JobFilters({ filters, onFilterChange }) {
  const renderChips = (key, options, allLabel = 'Todos') => (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onFilterChange(key, 'all')}
        className={`px-3 py-1 rounded-full text-xs font-caption font-medium transition-all ${
          filters?.[key] === 'all' ?'bg-primary text-primary-foreground' :'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
        }`}
      >
        {allLabel}
      </button>
      {options?.map(opt => (
        <button
          key={opt}
          onClick={() => onFilterChange(key, opt)}
          className={`px-3 py-1 rounded-full text-xs font-caption font-medium transition-all ${
            filters?.[key] === opt
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3 flex-wrap">
        <span className="text-xs font-caption font-semibold text-muted-foreground pt-1 min-w-[70px]">Categoría</span>
        {renderChips('category', jobService?.CATEGORIES)}
      </div>
      <div className="flex items-start gap-3 flex-wrap">
        <span className="text-xs font-caption font-semibold text-muted-foreground pt-1 min-w-[70px]">Modalidad</span>
        {renderChips('modality', jobService?.MODALITIES, 'Todas')}
      </div>
      <div className="flex items-start gap-3 flex-wrap">
        <span className="text-xs font-caption font-semibold text-muted-foreground pt-1 min-w-[70px]">Tipo</span>
        {renderChips('type', jobService?.TYPES, 'Todos')}
      </div>
    </div>
  );
}
