import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from 'components/AppIcon';

const CATEGORIES = [
  { value: 'all', label: 'Todo' },
  { value: 'businesses', label: 'Negocios' },
  { value: 'classified-ads', label: 'Clasificados' },
];

// Static hints shown when the input is empty — these navigate to real results
const HINTS = [
  'Veterinarias',
  'Farmacias',
  'Restaurantes',
  'Ferreterías',
  'Mecánica',
  'Salud',
];

export default function SearchBar({ placeholder = 'Buscar negocios, servicios o clasificados...', className = '' }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [showDropdown, setShowDropdown] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef?.current && !containerRef?.current?.contains(e?.target)) {
        setShowDropdown(false);
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (searchQuery = query) => {
    const q = searchQuery?.trim();
    if (!q) return;
    const destination = category === 'classified-ads'
      ? `/classified-ads-listing?q=${encodeURIComponent(q)}`
      : `/buscar?q=${encodeURIComponent(q)}`;
    navigate(destination);
    setShowDropdown(false);
    inputRef?.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (e?.key === 'Enter') handleSearch();
    if (e?.key === 'Escape') { setShowDropdown(false); inputRef?.current?.blur(); }
  };

  const handleHintClick = (hint) => {
    setQuery(hint);
    handleSearch(hint);
  };

  // Only show static hints when input is empty and focused
  const showHints = showDropdown && !query?.trim();

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div
        className={`
          flex items-center bg-card border rounded-md overflow-hidden
          transition-all duration-250 ease-smooth
          ${focused ? 'border-primary shadow-md' : 'border-border shadow-sm hover:border-secondary'}
        `}
        style={{ height: '52px' }}
      >
        {/* Category Selector */}
        <div className="relative shrink-0 border-r border-border">
          <select
            value={category}
            onChange={(e) => setCategory(e?.target?.value)}
            className="h-full pl-3 pr-7 text-sm font-caption text-foreground bg-transparent appearance-none cursor-pointer focus:outline-none"
            style={{ height: '52px' }}
            aria-label="Categoría de búsqueda"
          >
            {CATEGORIES?.map((cat) => (
              <option key={cat?.value} value={cat?.value}>{cat?.label}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
            <Icon name="ChevronDown" size={14} color="var(--color-secondary)" />
          </div>
        </div>

        {/* Search Icon */}
        <div className="pl-3 shrink-0">
          <Icon name="Search" size={18} color="var(--color-secondary)" />
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => { setQuery(e?.target?.value); setShowDropdown(true); }}
          onFocus={() => { setFocused(true); setShowDropdown(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 h-full px-3 text-base font-body text-foreground bg-transparent placeholder-muted-foreground focus:outline-none"
          aria-label="Campo de búsqueda"
          autoComplete="off"
        />

        {query && (
          <button
            onClick={() => { setQuery(''); inputRef?.current?.focus(); }}
            className="shrink-0 px-2 text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none"
            aria-label="Limpiar búsqueda"
          >
            <Icon name="X" size={16} color="currentColor" />
          </button>
        )}

        <button
          onClick={() => handleSearch()}
          className="shrink-0 px-5 h-full font-caption font-medium text-sm text-primary-foreground transition-all duration-250 ease-smooth hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          style={{ background: 'var(--color-primary)' }}
          aria-label="Buscar"
        >
          Buscar
        </button>
      </div>

      {/* Hints dropdown — only when empty input */}
      {showHints && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-[150] py-1 overflow-hidden">
          <p className="px-4 py-1.5 text-xs font-caption text-muted-foreground uppercase tracking-wider">
            Búsquedas frecuentes
          </p>
          {HINTS.map((hint) => (
            <button
              key={hint}
              onClick={() => handleHintClick(hint)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-caption text-card-foreground hover:bg-muted transition-colors duration-150 text-left min-h-[44px]"
            >
              <Icon name="TrendingUp" size={14} color="var(--color-secondary)" />
              {hint}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
