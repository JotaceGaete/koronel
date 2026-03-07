import React from 'react';

import Button from 'components/ui/Button';

export default function ResultsHeader({ count, loading, onOpenFilters, activeFilterCount }) {
  return (
    <div className="flex items-center justify-between mb-4 gap-3">
      <div>
        {loading ? (
          <div className="h-5 w-48 skeleton rounded" />
        ) : (
          <p className="text-sm font-caption text-muted-foreground">
            <span className="font-semibold text-foreground font-data">{count}</span> negocio{count !== 1 ? 's' : ''} encontrado{count !== 1 ? 's' : ''}
          </p>
        )}
      </div>
      {/* Mobile filter trigger */}
      <Button
        variant="outline"
        size="sm"
        iconName="SlidersHorizontal"
        iconPosition="left"
        iconSize={15}
        className="md:hidden relative"
        onClick={onOpenFilters}
      >
        Filtros
        {activeFilterCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-xs font-data flex items-center justify-center text-primary-foreground"
            style={{ background: 'var(--color-primary)', fontSize: '10px' }}>
            {activeFilterCount}
          </span>
        )}
      </Button>
    </div>
  );
}