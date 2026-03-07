import React, { useRef, useEffect } from 'react';
import Icon from 'components/AppIcon';
import SearchMapBusinessCard from './SearchMapBusinessCard';

export default function SearchMapLeftPanel({
  searchQuery,
  onSearchChange,
  categoryTree,
  selectedParent,
  onSelectParent,
  businesses,
  loading,
  selectedId,
  onCardClick,
  cardRefs,
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Sticky search + filters */}
      <div className="shrink-0 border-b border-border bg-card px-3 pt-3 pb-2">
        {/* Search */}
        <div className="relative mb-2">
          <Icon
            name="Search"
            size={16}
            color="var(--color-muted-foreground)"
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e?.target?.value)}
            placeholder="Buscar negocios..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors"
            >
              <Icon name="X" size={13} color="var(--color-muted-foreground)" />
            </button>
          )}
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => onSelectParent('all')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-caption font-medium whitespace-nowrap shrink-0 transition-all ${
              selectedParent === 'all' ?'bg-primary text-primary-foreground shadow-sm' :'bg-muted border border-border text-secondary hover:bg-muted/80'
            }`}
          >
            <Icon name="LayoutGrid" size={12} color="currentColor" />
            Todos
          </button>
          {categoryTree?.map((cat) => (
            <button
              key={cat?.id}
              onClick={() => onSelectParent(cat?.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-caption font-medium whitespace-nowrap shrink-0 transition-all ${
                selectedParent === cat?.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted border border-border text-secondary hover:bg-muted/80'
              }`}
            >
              <Icon name={cat?.icon || 'Tag'} size={12} color="currentColor" />
              {cat?.name}
            </button>
          ))}
        </div>
      </div>
      {/* Results count */}
      <div className="px-3 py-2 shrink-0">
        {loading ? (
          <div className="h-4 w-32 skeleton rounded" />
        ) : (
          <p className="text-xs font-caption text-muted-foreground">
            <span className="font-semibold text-foreground font-data">{businesses?.length}</span> negocio{businesses?.length !== 1 ? 's' : ''} encontrado{businesses?.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        {loading && businesses?.length === 0 ? (
          Array.from({ length: 6 })?.map((_, i) => (
            <div key={i} className="flex gap-3 p-3 border border-border rounded-lg animate-pulse">
              <div className="w-24 h-20 rounded-md bg-muted shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </div>
          ))
        ) : businesses?.length === 0 ? (
          <div className="py-12 text-center">
            <Icon name="Building2" size={40} color="var(--color-muted-foreground)" className="mx-auto mb-3" />
            <p className="font-heading font-semibold text-foreground text-sm mb-1">No se encontraron negocios</p>
            <p className="text-xs font-caption text-muted-foreground">Intenta con otros filtros o términos de búsqueda.</p>
          </div>
        ) : (
          businesses?.map((business) => (
            <SearchMapBusinessCard
              key={business?.id}
              business={business}
              isSelected={selectedId === business?.id}
              onClick={() => onCardClick(business)}
              cardRef={(el) => { if (cardRefs) cardRefs.current[business?.id] = el; }}
            />
          ))
        )}
      </div>
    </div>
  );
}
