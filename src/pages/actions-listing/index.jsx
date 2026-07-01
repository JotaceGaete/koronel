// Route: /acciones  — Listado público de acciones comerciales
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PageMeta from 'components/PageMeta';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import { actionService } from '../../services/actionService';
import ActionCard from './components/ActionCard';
import UrgentStrip from './components/UrgentStrip';

const PAGE_SIZE = 12;

function Skeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
      ))}
    </div>
  );
}

export default function ActionsListing() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const [search, setSearch] = useState(params.get('q') || '');
  const [searchInput, setSearchInput] = useState(params.get('q') || '');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState([]);
  const [total, setTotal] = useState(0);
  const [urgent, setUrgent] = useState([]);
  const [urgentLoaded, setUrgentLoaded] = useState(false);

  const fetchActions = useCallback(async (reset = false) => {
    setLoading(true);
    const currentPage = reset ? 1 : page;
    const { data, count, error } = await actionService.getAll({ search, sort, page: currentPage, pageSize: PAGE_SIZE });
    if (!error) {
      const formatted = (data || []).map(a => ({ ...actionService.formatAction(a), _formatted: actionService.formatAction(a) }));
      setActions(prev => (reset || currentPage === 1) ? formatted : [...prev, ...formatted]);
      setTotal(count);
    }
    setLoading(false);
  }, [search, sort, page]);

  useEffect(() => { setPage(1); fetchActions(true); }, [search, sort]);
  useEffect(() => { if (page > 1) fetchActions(false); }, [page]);

  useEffect(() => {
    actionService.getUrgent(6).then(({ data }) => {
      setUrgent(data || []);
      setUrgentLoaded(true);
    });
  }, []);

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); setPage(1); };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <PageMeta title="Acciones comerciales" description="Ofertas, lanzamientos y promociones de negocios locales en Coronel." path="/acciones" />
      <Header />
      <div style={{ paddingTop: '64px' }}>

        {/* Hero */}
        <div style={{ background: 'var(--color-primary)' }} className="px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Icon name="Zap" size={18} color="white" />
              </div>
              <h1 className="font-heading font-bold text-xl md:text-2xl text-white">Acciones comerciales</h1>
            </div>
            <p className="text-white/80 text-sm mb-4 ml-12">
              Ofertas, lanzamientos y promociones de negocios locales. Aprovecha antes de que expiren.
            </p>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="flex-1 flex items-center bg-card rounded-lg overflow-hidden border border-border shadow-sm h-11">
                <div className="pl-3 shrink-0">
                  <Icon name="Search" size={16} color="var(--color-secondary)" />
                </div>
                <input
                  type="search"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Buscar ofertas, lanzamientos..."
                  className="flex-1 px-3 h-full text-sm font-caption bg-transparent text-foreground placeholder-muted-foreground focus:outline-none"
                />
              </div>
              <button type="submit" className="h-11 px-4 rounded-lg text-sm font-semibold font-caption text-primary-foreground shrink-0 transition-opacity hover:opacity-90" style={{ background: 'rgba(255,255,255,0.2)' }}>
                Buscar
              </button>
            </form>
          </div>
        </div>

        {/* Main */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">

          {/* Urgent strip */}
          {urgentLoaded && urgent.length > 0 && <UrgentStrip actions={urgent} />}

          {/* Sort + count bar */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-caption text-muted-foreground">
              {loading && actions.length === 0 ? 'Cargando...' : `${total.toLocaleString('es-CL')} acciones`}
            </p>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="text-sm font-caption border border-border bg-card text-foreground rounded-lg px-3 h-9 focus:outline-none"
            >
              <option value="newest">Más recientes</option>
              <option value="ending_soon">Terminan pronto</option>
              <option value="most_viewed">Más vistas</option>
            </select>
          </div>

          {/* Grid */}
          {loading && actions.length === 0 ? (
            <Skeleton />
          ) : actions.length === 0 ? (
            <div className="py-20 text-center">
              <Icon name="Inbox" size={40} color="var(--color-muted-foreground)" className="mx-auto mb-3" />
              <p className="text-sm font-caption text-muted-foreground">No hay acciones activas en este momento.</p>
              <Link to="/crecer/nueva" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold font-caption text-primary">
                <Icon name="Plus" size={14} /> Publicar una acción
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {actions.map(a => <ActionCard key={a.id} action={a} />)}
                {loading && Array.from({ length: 4 }).map((_, i) => (
                  <div key={`sk-${i}`} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
                ))}
              </div>
              {actions.length < total && !loading && (
                <div className="text-center">
                  <button
                    onClick={() => setPage(p => p + 1)}
                    className="px-6 py-2.5 rounded-xl border border-border bg-card text-sm font-caption font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    Cargar más
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sticky CTA mobile */}
        <div className="fixed bottom-0 left-0 right-0 p-4 pointer-events-none md:hidden">
          <Link
            to="/crecer/nueva"
            className="pointer-events-auto mx-auto max-w-xs flex items-center justify-center gap-2 h-12 rounded-2xl text-sm font-semibold font-caption text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}
          >
            <Icon name="Plus" size={16} color="white" />
            Publicar una acción
          </Link>
        </div>
      </div>
    </div>
  );
}
