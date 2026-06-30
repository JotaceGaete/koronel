import React, { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageMeta from 'components/PageMeta';
import Header from 'components/ui/Header';
import CategoryFilter from 'components/ui/CategoryFilter';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import AdCardSkeleton from '../classified-ads-listing/components/AdCardSkeleton';
import EmptyState from '../classified-ads-listing/components/EmptyState';
import SortBar from '../classified-ads-listing/components/SortBar';
import { adService } from '../../services/adService';

const PAGE_SIZE = 9;

function formatExpiry(expiresAt) {
  if (!expiresAt) return null;
  const d = new Date(expiresAt);
  if (isNaN(d)) return null;
  const now = new Date();
  if (d < now) return 'Expirada';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `Válido hasta ${day}/${month}`;
}

function OfertaCard({ ad }) {
  const navigate = useNavigate();
  const expiry = formatExpiry(ad?.expires_at);
  const expired = expiry === 'Expirada';

  return (
    <div
      className={`bg-card border rounded-lg overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col ${expired ? 'opacity-60 border-border' : 'border-border hover:border-primary/40'}`}
      onClick={() => navigate(`/clasificados/${ad?.id}`)}
    >
      {ad?.image && (
        <div className="w-full h-40 overflow-hidden bg-muted shrink-0 relative">
          <img src={ad.image} alt={ad.imageAlt || ad.title} className="w-full h-full object-cover" />
          {expiry && (
            <span
              className={`absolute top-2 right-2 text-xs font-caption font-semibold px-2 py-1 rounded-full ${
                expired
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-accent text-accent-foreground'
              }`}
              style={!expired ? { background: 'var(--color-accent)', color: 'var(--color-accent-foreground)' } : {}}
            >
              {expiry}
            </span>
          )}
        </div>
      )}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div>
          {ad?.category && (
            <span className="text-xs font-caption px-2 py-0.5 rounded-full bg-muted text-muted-foreground mb-1 inline-block">
              {ad.category}
            </span>
          )}
          <h3 className="font-heading font-semibold text-sm text-card-foreground line-clamp-2">{ad?.title}</h3>
          {ad?.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{ad.description}</p>
          )}
        </div>

        {ad?.price && (
          <p className="text-base font-data font-bold" style={{ color: 'var(--color-primary)' }}>
            ${Number(ad.price).toLocaleString('es-CL')}
            {ad?.price_negotiable && <span className="text-xs font-caption font-normal text-muted-foreground ml-1">(negociable)</span>}
          </p>
        )}

        {ad?.location && (
          <div className="flex items-center gap-1">
            <Icon name="MapPin" size={11} color="var(--color-secondary)" />
            <span className="text-xs font-caption text-muted-foreground">{ad.location}</span>
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-1">
          <button
            onClick={e => { e?.stopPropagation(); navigate(`/clasificados/${ad?.id}`); }}
            className="flex-1 py-2 rounded-md text-xs font-caption font-semibold text-primary-foreground transition-all hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}
          >
            Ver oferta
          </button>
          {ad?.phone && (
            <a
              href={`tel:${ad.phone}`}
              onClick={e => e?.stopPropagation()}
              className="flex items-center justify-center w-9 h-9 rounded-md border border-border bg-muted hover:bg-primary hover:text-primary-foreground transition-all shrink-0"
              aria-label="Llamar"
            >
              <Icon name="Phone" size={14} color="currentColor" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OfertasListing() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialQuery = params?.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  const fetchAds = useCallback(async (resetPage = false) => {
    setLoading(true);
    const currentPage = resetPage ? 1 : page;
    const { data, count, error } = await adService?.getAll({
      listingType: 'oferta',
      category: selectedCategory,
      search: searchQuery,
      sort,
      page: currentPage,
      pageSize: PAGE_SIZE,
    });
    if (!error) {
      const formatted = (data || [])?.map(ad => adService?.formatAd(ad));
      if (resetPage || currentPage === 1) {
        setAds(formatted);
      } else {
        setAds(prev => [...prev, ...formatted]);
      }
      setTotalCount(count);
    }
    setLoading(false);
  }, [selectedCategory, searchQuery, sort, page]);

  useEffect(() => {
    setPage(1);
    fetchAds(true);
  }, [selectedCategory, searchQuery, sort]);

  useEffect(() => {
    if (page > 1) fetchAds(false);
  }, [page]);

  const handleSearch = (e) => {
    e?.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleReset = () => {
    setSearchQuery('');
    setSearchInput('');
    setSelectedCategory('all');
    setSort('newest');
    setPage(1);
  };

  const hasMore = ads?.length < totalCount;
  const listingPath = location.pathname + (location.search || '');

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <PageMeta title="Ofertas" description="Promociones y oportunidades de negocios locales en Coronel. Descuentos por tiempo limitado." path={listingPath} />
      <Header />
      <div style={{ paddingTop: '64px' }}>
        {/* Page Header */}
        <div style={{ background: 'var(--color-primary)' }} className="px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Icon name="Tag" size={18} color="white" />
              </div>
              <h1 className="font-heading font-bold text-xl md:text-2xl lg:text-3xl text-white">
                Ofertas
              </h1>
            </div>
            <p className="text-white/80 text-sm mb-4 ml-12">Promociones y oportunidades de negocios locales. Aprovecha antes de que expiren.</p>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="flex-1 flex items-center bg-card rounded-md overflow-hidden border border-border shadow-sm h-11">
                <div className="pl-3 shrink-0">
                  <Icon name="Search" size={18} color="var(--color-secondary)" />
                </div>
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e?.target?.value)}
                  placeholder="Buscar ofertas..."
                  className="flex-1 px-3 h-full text-sm font-caption bg-transparent text-foreground placeholder-muted-foreground focus:outline-none"
                />
              </div>
              <Button type="submit" variant="default" size="sm" className="h-11 px-4 shrink-0">
                Buscar
              </Button>
            </form>
          </div>
        </div>

        {/* Category Filter */}
        <div className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <CategoryFilter
              selected={selectedCategory}
              onChange={(cat) => { setSelectedCategory(cat); setPage(1); }}
              type="ads"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
          <SortBar
            count={totalCount}
            sort={sort}
            onSortChange={setSort}
            onMobileFilterOpen={() => {}}
          />

          {loading && ads?.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
              {Array.from({ length: PAGE_SIZE })?.map((_, i) => <AdCardSkeleton key={i} />)}
            </div>
          ) : ads?.length === 0 ? (
            <EmptyState onReset={handleReset} />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                {ads?.map((ad) => (
                  <OfertaCard key={ad?.id} ad={ad} />
                ))}
                {loading && Array.from({ length: 3 })?.map((_, i) => <AdCardSkeleton key={`sk-${i}`} />)}
              </div>
              {hasMore && !loading && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setPage(p => p + 1)}
                    className="px-6 py-2.5 rounded-md border border-border bg-card text-sm font-caption font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    Cargar más ofertas
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
