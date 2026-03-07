import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';
import { businessService } from '../../services/businessService';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

function humanizeCategory(key) {
  if (!key || typeof key !== 'string') return '';
  return key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SmartSearchInput({
  placeholder = 'Buscar negocios, categorías o dirección...',
  className = '',
  value,
  onChange,
  onSearch,
}) {
  const navigate = useNavigate();
  const [internalQuery, setInternalQuery] = useState('');
  const isControlled = value !== undefined && onChange !== undefined;
  const query = isControlled ? (value || '') : internalQuery;
  const setQuery = useCallback(
    (v) => {
      if (isControlled) onChange(v);
      else setInternalQuery(v);
    },
    [isControlled, onChange]
  );
  const [suggestions, setSuggestions] = useState({ businesses: [], categories: [] });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const hasResults =
    suggestions?.businesses?.length > 0 || suggestions?.categories?.length > 0;
  const totalItems =
    (suggestions?.businesses?.length || 0) + (suggestions?.categories?.length || 0);

  const fetchSuggestions = useCallback(async (q) => {
    if (!q || q.length < MIN_QUERY_LENGTH) {
      setSuggestions({ businesses: [], categories: [] });
      return;
    }
    setLoading(true);
    const { businesses, categories } = await businessService?.searchSuggestions(q, 6);
    setSuggestions({ businesses: businesses || [], categories: categories || [] });
    setLoading(false);
    setActiveIndex(-1);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query?.trim()) {
      setSuggestions({ businesses: [], categories: [] });
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query?.trim());
      setOpen(true);
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef?.current);
  }, [query, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef?.current && !containerRef?.current?.contains(e?.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const goToBusiness = (id) => {
    setOpen(false);
    setQuery('');
    navigate(`/business-profile-page?id=${id}`);
  };

  const goToCategory = (nameKey) => {
    setOpen(false);
    setQuery('');
    navigate(`/directorio-negocios?category=${encodeURIComponent(nameKey)}`);
  };

  const goToAllResults = () => {
    setOpen(false);
    const q = query?.trim();
    if (onSearch) onSearch(q);
    else if (q) navigate(`/directorio-negocios?q=${encodeURIComponent(q)}`);
    inputRef?.current?.blur();
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    goToAllResults();
    inputRef?.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (e?.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      inputRef?.current?.blur();
      return;
    }
    if (e?.key === 'Enter') {
      if (activeIndex >= 0 && totalItems > 0) {
        e.preventDefault();
        const bCount = suggestions?.businesses?.length || 0;
        if (activeIndex < bCount) {
          goToBusiness(suggestions.businesses[activeIndex]?.id);
        } else {
          const cat = suggestions?.categories?.[activeIndex - bCount];
          if (cat) goToCategory(cat?.name_key);
        }
      } else {
        handleSubmit(e);
      }
      return;
    }
    if (e?.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i < totalItems - 1 ? i + 1 : i));
    } else if (e?.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : -1));
    }
  };

  const showDropdown = open && query?.trim()?.length >= MIN_QUERY_LENGTH;
  const showEmpty = showDropdown && !loading && !hasResults;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center bg-card rounded-xl shadow-sm border border-border overflow-hidden ring-2 ring-transparent focus-within:ring-primary/30 transition-shadow">
          <div className="flex items-center flex-1 min-h-[48px] sm:min-h-[52px] pl-3 sm:pl-4 pr-2">
            <Icon name="Search" size={20} color="var(--color-muted-foreground)" className="shrink-0" aria-hidden />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e?.target?.value)}
              onFocus={() => query?.trim()?.length >= MIN_QUERY_LENGTH && setOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 min-h-[48px] sm:min-h-[52px] py-2.5 px-2 text-base text-foreground placeholder:text-muted-foreground outline-none bg-transparent"
              aria-label="Buscar negocios, categorías o dirección"
              aria-autocomplete="list"
              aria-expanded={showDropdown}
              aria-controls="smart-search-listbox"
              autoComplete="off"
            />
          </div>
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setOpen(false); inputRef?.current?.focus(); }}
              className="shrink-0 p-2 text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Limpiar"
            >
              <Icon name="X" size={18} color="currentColor" />
            </button>
          )}
          <button
            type="submit"
            className="min-h-[48px] sm:min-h-[52px] px-4 sm:px-5 shrink-0 text-sm font-semibold text-white hover:opacity-90 active:opacity-95 transition-opacity"
            style={{ background: 'var(--color-primary)' }}
            aria-label="Buscar"
          >
            Buscar
          </button>
        </div>
      </form>

      {/* Dropdown de sugerencias */}
      {showDropdown && (
        <div
          id="smart-search-listbox"
          className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-[200] overflow-hidden max-h-[min(70vh,400px)] overflow-y-auto"
          role="listbox"
          aria-label="Sugerencias de búsqueda"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <span className="animate-pulse">Buscando...</span>
            </div>
          ) : showEmpty ? (
            <div className="px-4 py-8 text-center">
              <Icon name="SearchX" size={32} color="var(--color-muted-foreground)" className="mx-auto mb-2 opacity-60" />
              <p className="text-sm font-caption text-muted-foreground">
                No encontramos resultados, prueba con otra búsqueda.
              </p>
              <button
                type="button"
                onClick={goToAllResults}
                className="mt-3 text-sm font-caption font-semibold text-primary hover:underline"
              >
                Ver todos los resultados para &quot;{query}&quot;
              </button>
            </div>
          ) : (
            <>
              {suggestions?.businesses?.length > 0 && (
                <div className="py-2">
                  <p className="px-4 py-1.5 text-xs font-caption text-muted-foreground uppercase tracking-wider">
                    Negocios
                  </p>
                  {suggestions.businesses.map((b, i) => (
                    <button
                      key={b?.id}
                      type="button"
                      onClick={() => goToBusiness(b?.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left min-h-[44px] transition-colors ${
                        activeIndex === i ? 'bg-muted' : 'hover:bg-muted/70'
                      }`}
                      role="option"
                      aria-selected={activeIndex === i}
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                        {b?.image ? (
                          <Image src={b.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon name="Building2" size={20} color="var(--color-muted-foreground)" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-caption font-semibold text-foreground truncate">{b?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {b?.category_key ? humanizeCategory(b.category_key) : 'Negocio'} · Coronel
                        </p>
                      </div>
                      <Icon name="ChevronRight" size={16} color="var(--color-muted-foreground)" className="shrink-0" />
                    </button>
                  ))}
                </div>
              )}
              {suggestions?.categories?.length > 0 && (
                <div className="py-2 border-t border-border">
                  <p className="px-4 py-1.5 text-xs font-caption text-muted-foreground uppercase tracking-wider">
                    Categorías
                  </p>
                  {suggestions.categories.map((c, i) => {
                    const idx = (suggestions?.businesses?.length || 0) + i;
                    return (
                      <button
                        key={c?.id}
                        type="button"
                        onClick={() => goToCategory(c?.name_key)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left min-h-[44px] transition-colors ${
                          activeIndex === idx ? 'bg-muted' : 'hover:bg-muted/70'
                        }`}
                        role="option"
                        aria-selected={activeIndex === idx}
                      >
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Icon name={c?.icon || 'Tag'} size={20} color="var(--color-primary)" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-caption font-semibold text-foreground truncate">{c?.name}</p>
                          <p className="text-xs text-muted-foreground">Ver listado</p>
                        </div>
                        <Icon name="ChevronRight" size={16} color="var(--color-muted-foreground)" className="shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
              {hasResults && (
                <div className="border-t border-border p-2">
                  <button
                    type="button"
                    onClick={goToAllResults}
                    className="w-full flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg text-sm font-caption font-semibold text-primary hover:bg-muted transition-colors"
                  >
                    <Icon name="Search" size={18} color="currentColor" />
                    Ver todos los resultados para &quot;{query}&quot;
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
