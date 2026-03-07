import React, { useState, useEffect, useRef } from 'react';
import Icon from 'components/AppIcon';
import { communityService } from '../../../services/communityService';

export default function BusinessSearchDropdown({ value, onChange, onClear }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const searchTimeout = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef?.current && !containerRef?.current?.contains(e?.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (val) => {
    setQuery(val);
    clearTimeout(searchTimeout?.current);
    if (!val?.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setLoading(true);
      const { data } = await communityService?.searchBusinesses(val);
      setResults(data || []);
      setOpen(true);
      setLoading(false);
    }, 300);
  };

  const handleSelect = (business) => {
    onChange?.(business);
    setQuery(business?.name);
    setOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    onClear?.();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Icon name="Search" size={15} color="var(--color-muted-foreground)" className="absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={value ? value?.name : query}
          onChange={e => { if (!value) handleSearch(e?.target?.value); }}
          onFocus={() => { if (!value && query) setOpen(true); }}
          placeholder="Buscar negocio en el directorio..."
          className="w-full pl-9 pr-8 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          readOnly={!!value}
        />
        {(value || query) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted"
          >
            <Icon name="X" size={14} color="var(--color-muted-foreground)" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">Buscando...</div>
          ) : results?.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">No se encontraron negocios</div>
          ) : results?.map(biz => (
            <button
              key={biz?.id}
              type="button"
              onClick={() => handleSelect(biz)}
              className="w-full text-left px-4 py-2.5 hover:bg-muted transition-colors"
            >
              <p className="text-sm font-medium text-foreground">{biz?.name}</p>
              <p className="text-xs text-muted-foreground">{biz?.category} · {biz?.address}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
