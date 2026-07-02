import React, { useState, useRef, useEffect } from 'react';
import Icon from 'components/AppIcon';

export default function MapSearchBar({
  search,
  onSearchChange,
  onSearchSubmit,
  suggestions = [],
  onSuggestionClick,
  showBusinesses,
  showEvents,
  showCommunity,
  onToggleBusinesses,
  onToggleEvents,
  onToggleCommunity,
  categories = [],
  selectedCategoryId,
  onCategoryChange,
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setShowSuggestions(false);
      onSearchSubmit?.(search);
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setShowSuggestions(false);
    onSuggestionClick?.(suggestion);
  };

  const handleClear = () => {
    onSearchChange?.('');
    onSearchSubmit?.('');
    setShowSuggestions(false);
  };

  return (
    <div
      className="absolute top-0 left-0 right-0 z-[400] px-3 pt-3 pb-2"
      style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.99) 82%, transparent)' }}
    >
      {/* Search Input — protagonist */}
      <div className="relative mb-2.5" ref={wrapperRef}>
        <button
          onClick={() => onSearchSubmit?.(search)}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted transition-colors"
          aria-label="Buscar"
        >
          <Icon name="Search" size={18} color="var(--color-primary)" />
        </button>

        <input
          type="text"
          value={search}
          onChange={e => {
            onSearchChange?.(e.target.value);
            setShowSuggestions(e.target.value.length >= 2);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (search.length >= 2) setShowSuggestions(true); }}
          placeholder="Buscar negocios, categorías o lugares..."
          className="w-full pl-10 pr-10 py-3 text-sm border-2 rounded-xl bg-white text-foreground focus:outline-none shadow-md transition-shadow focus:shadow-lg"
          style={{ borderColor: 'var(--color-primary)', color: 'var(--color-foreground)' }}
        />

        {search && (
          <button
            onClick={handleClear}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors"
            aria-label="Limpiar"
          >
            <Icon name="X" size={14} color="var(--color-muted-foreground)" />
          </button>
        )}

        {/* Autocomplete dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-xl z-10 overflow-hidden">
            {suggestions.map(s => (
              <button
                key={s.id}
                onClick={() => handleSuggestionClick(s)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
              >
                <Icon name="Building2" size={14} color="var(--color-primary)" className="shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                  {s.category && (
                    <p className="text-xs text-muted-foreground truncate">{s.category}</p>
                  )}
                </div>
                <Icon name="MapPin" size={12} color="var(--color-muted-foreground)" className="shrink-0 ml-auto" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Layer toggles + category filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {/* Layer toggles */}
        <button
          onClick={onToggleBusinesses}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
            showBusinesses ? 'text-white border-transparent' : 'border-border text-muted-foreground bg-white hover:bg-muted'
          }`}
          style={showBusinesses ? { background: '#2563eb' } : {}}
        >
          <div className="w-2 h-2 rounded-full" style={{ background: showBusinesses ? 'white' : '#2563eb' }} />
          Negocios
        </button>

        <button
          onClick={onToggleEvents}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
            showEvents ? 'text-white border-transparent' : 'border-border text-muted-foreground bg-white hover:bg-muted'
          }`}
          style={showEvents ? { background: '#ea580c' } : {}}
        >
          <div className="w-2 h-2 rounded-full" style={{ background: showEvents ? 'white' : '#ea580c' }} />
          Eventos
        </button>

        <button
          onClick={onToggleCommunity}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
            showCommunity ? 'text-white border-transparent' : 'border-border text-muted-foreground bg-white hover:bg-muted'
          }`}
          style={showCommunity ? { background: '#7c3aed' } : {}}
        >
          <div className="w-2 h-2 rounded-full" style={{ background: showCommunity ? 'white' : '#7c3aed' }} />
          Preguntas
        </button>

        {/* Divider */}
        {categories.length > 0 && (
          <div className="w-px h-5 bg-border flex-shrink-0" />
        )}

        {/* Category chips — loaded from DB */}
        {categories.length > 0 && (
          <>
            <button
              onClick={() => onCategoryChange?.(null)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                !selectedCategoryId ? 'text-white border-transparent' : 'border-border text-muted-foreground bg-white hover:bg-muted'
              }`}
              style={!selectedCategoryId ? { background: 'var(--color-foreground)' } : {}}
            >
              Todas
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => onCategoryChange?.(cat.name_key)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                  selectedCategoryId === cat.name_key
                    ? 'text-white border-transparent'
                    : 'border-border text-muted-foreground bg-white hover:bg-muted'
                }`}
                style={selectedCategoryId === cat.id ? { background: 'var(--color-primary)' } : {}}
              >
                {cat.name}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
