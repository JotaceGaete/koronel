import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from 'components/AppIcon';

const CATEGORIES = [
  { value: 'all', label: 'Todo' },
  { value: 'businesses', label: 'Negocios' },
  { value: 'classified-ads', label: 'Clasificados' },
];

const SUGGESTIONS = {
  businesses: ['Restaurantes', 'Ferreterías', 'Salud', 'Educación', 'Mecánica', 'Supermercados'],
  'classified-ads': ['Vehículos', 'Inmuebles', 'Electrónica', 'Ropa', 'Empleos', 'Servicios'],
  all: ['Restaurantes', 'Vehículos', 'Inmuebles', 'Ferreterías', 'Electrónica', 'Empleos'],
};

export default function SearchBar({ placeholder = 'Buscar negocios, servicios o clasificados...', className = '' }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const filteredSuggestions = query?.length === 0
    ? SUGGESTIONS?.[category]
    : SUGGESTIONS?.[category]?.filter((s) => s?.toLowerCase()?.includes(query?.toLowerCase()));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef?.current && !containerRef?.current?.contains(e?.target)) {
        setShowSuggestions(false);
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (searchQuery = query) => {
    if (!searchQuery?.trim()) return;
    const destination = category === 'classified-ads'
      ? `/classified-ads-listing?q=${encodeURIComponent(searchQuery)}`
      : `/business-directory-listing?q=${encodeURIComponent(searchQuery)}`;
    navigate(destination);
    setShowSuggestions(false);
    inputRef?.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (e?.key === 'Enter') handleSearch();
    if (e?.key === 'Escape') {
      setShowSuggestions(false);
      inputRef?.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div
        className={`
          flex items-center bg-card border rounded-md overflow-hidden
          transition-all duration-250 ease-smooth
          ${focused
            ? 'border-primary shadow-md'
            : 'border-border shadow-sm hover:border-secondary'
          }
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
          onChange={(e) => {
            setQuery(e?.target?.value);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            setFocused(true);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 h-full px-3 text-base font-body text-foreground bg-transparent placeholder-muted-foreground focus:outline-none"
          aria-label="Campo de búsqueda"
          aria-autoComplete="list"
          aria-expanded={showSuggestions && filteredSuggestions?.length > 0}
          autoComplete="off"
        />

        {/* Clear */}
        {query && (
          <button
            onClick={() => { setQuery(''); inputRef?.current?.focus(); }}
            className="shrink-0 px-2 text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none"
            aria-label="Limpiar búsqueda"
          >
            <Icon name="X" size={16} color="currentColor" />
          </button>
        )}

        {/* Search Button */}
        <button
          onClick={() => handleSearch()}
          className="shrink-0 px-5 h-full font-caption font-medium text-sm text-primary-foreground transition-all duration-250 ease-smooth hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          style={{ background: 'var(--color-primary)' }}
          aria-label="Buscar"
        >
          Buscar
        </button>
      </div>
      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions?.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-[150] py-1 overflow-hidden"
          role="listbox"
          aria-label="Sugerencias de búsqueda"
        >
          <p className="px-4 py-1.5 text-xs font-caption text-muted-foreground uppercase tracking-wider">
            Sugerencias
          </p>
          {filteredSuggestions?.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-caption text-card-foreground hover:bg-muted transition-colors duration-150 text-left min-h-[44px]"
              role="option"
            >
              <Icon name="Search" size={14} color="var(--color-secondary)" />
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}