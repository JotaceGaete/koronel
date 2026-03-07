import React, { useState, useRef, useEffect } from 'react';
import Icon from 'components/AppIcon';
import { jobService } from '../../../services/jobService';

export default function BusinessLinkSection({ selectedBusiness, onSelect, onClear }) {
  const [mode, setMode] = useState(null); // null | 'search' | 'skip'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef?.current && !dropdownRef?.current?.contains(e?.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleQueryChange = (val) => {
    setQuery(val);
    setShowDropdown(true);
    clearTimeout(debounceRef?.current);
    if (!val?.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await jobService?.searchBusinessesForLink(val);
      setResults(data || []);
      setSearching(false);
    }, 350);
  };

  const handleSelect = (biz) => {
    onSelect(biz);
    setQuery(biz?.name);
    setShowDropdown(false);
    setResults([]);
  };

  const handleClear = () => {
    onClear();
    setQuery('');
    setResults([]);
    setMode(null);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Icon name="Building2" size={18} color="var(--color-primary)" />
        <h2 className="text-base font-heading font-semibold text-foreground">¿Tu negocio ya está en el directorio?</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Vincula esta oferta a tu negocio para que aparezca en su perfil.</p>

      {/* Selected business */}
      {selectedBusiness ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 mb-3" style={{ borderColor: 'var(--color-primary)', background: 'var(--color-primary)10' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-primary)' }}>
            <Icon name="Building2" size={16} color="white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-caption font-semibold text-foreground truncate">{selectedBusiness?.name}</p>
            {selectedBusiness?.address && (
              <p className="text-xs text-muted-foreground truncate">{selectedBusiness?.address}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-md hover:bg-muted transition-colors flex-shrink-0"
            title="Quitar vinculación"
          >
            <Icon name="X" size={14} color="var(--color-muted-foreground)" />
          </button>
        </div>
      ) : (
        <>
          {/* Mode selector */}
          {mode === null && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setMode('search')}
                className="flex-1 flex items-center gap-2.5 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <Icon name="Search" size={18} color="var(--color-primary)" />
                <div>
                  <p className="text-sm font-caption font-semibold text-foreground">Buscar mi negocio</p>
                  <p className="text-xs text-muted-foreground">Vincula la oferta al perfil de tu negocio</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode('skip')}
                className="flex-1 flex items-center gap-2.5 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-border hover:bg-muted/50 transition-all text-left"
              >
                <Icon name="SkipForward" size={18} color="var(--color-muted-foreground)" />
                <div>
                  <p className="text-sm font-caption font-semibold text-foreground">Continuar sin vincular</p>
                  <p className="text-xs text-muted-foreground">Solo se mostrará el nombre de la empresa</p>
                </div>
              </button>
            </div>
          )}

          {/* Search mode */}
          {mode === 'search' && (
            <div ref={dropdownRef} className="relative">
              <div className="relative">
                <Icon name="Search" size={15} color="var(--color-muted-foreground)" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={e => handleQueryChange(e?.target?.value)}
                  onFocus={() => query?.trim() && setShowDropdown(true)}
                  placeholder="Escribe el nombre de tu negocio..."
                  autoFocus
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
                  </div>
                )}
              </div>

              {showDropdown && results?.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                  {results?.map(biz => (
                    <button
                      key={biz?.id}
                      type="button"
                      onClick={() => handleSelect(biz)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left border-b border-border last:border-0"
                    >
                      <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-primary)20' }}>
                        <Icon name="Building2" size={14} color="var(--color-primary)" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-caption font-medium text-foreground truncate">{biz?.name}</p>
                        {biz?.address && <p className="text-xs text-muted-foreground truncate">{biz?.address}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showDropdown && query?.trim() && !searching && results?.length === 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-sm px-4 py-3">
                  <p className="text-sm text-muted-foreground">No se encontraron negocios con ese nombre.</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => { setMode(null); setQuery(''); setResults([]); }}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Volver
              </button>
            </div>
          )}

          {/* Skip mode confirmation */}
          {mode === 'skip' && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted border border-border">
              <Icon name="Info" size={15} color="var(--color-muted-foreground)" />
              <p className="text-sm text-muted-foreground flex-1">La oferta se publicará sin vinculación a un negocio del directorio.</p>
              <button
                type="button"
                onClick={() => setMode(null)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                Cambiar
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
