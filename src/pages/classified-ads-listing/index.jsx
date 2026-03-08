import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PageMeta from 'components/PageMeta';
import Header from 'components/ui/Header';
import CategoryFilter from 'components/ui/CategoryFilter';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import AdCard from './components/AdCard';
import FilterPanel from './components/FilterPanel';
import SortBar from './components/SortBar';
import AdCardSkeleton from './components/AdCardSkeleton';
import EmptyState from './components/EmptyState';
import { adService } from '../../services/adService';

const DEFAULT_FILTERS = { priceRange: 'all', dateFilter: 'all', condition: 'all' };
const PAGE_SIZE = 8;

export default function ClassifiedAdsListing() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialQuery = params?.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const loaderRef = useRef(null);

  const fetchAds = useCallback(async (resetPage = false) => {
    setLoading(true);
    const currentPage = resetPage ? 1 : page;
    const { data, count, error } = await adService?.getAll({
      category: selectedCategory,
      search: searchQuery,
      priceRange: filters?.priceRange,
      dateFilter: filters?.dateFilter,
      condition: filters?.condition,
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
  }, [selectedCategory, searchQuery, filters, sort, page]);

  useEffect(() => {
    setPage(1);
    fetchAds(true);
  }, [selectedCategory, searchQuery, filters, sort]);

  useEffect(() => {
    if (page > 1) fetchAds(false);
  }, [page]);

  const handleLoadMore = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  const handleSearch = (e) => {
    e?.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    setPage(1);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
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
      <PageMeta title="Clasificados" description="Avisos clasificados en Coronel. Compra, vende y encuentra lo que buscas." path={listingPath} />
      <Header />
      <div style={{ paddingTop: '64px' }}>
        {/* Page Header */}
        <div style={{ background: 'var(--color-primary)' }} className="px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="font-heading font-bold text-xl md:text-2xl lg:text-3xl text-white mb-4">
              Clasificados en Coronel
            </h1>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="flex-1 flex items-center bg-card rounded-md overflow-hidden border border-border shadow-sm h-11">
                <div className="pl-3 shrink-0">
                  <Icon name="Search" size={18} color="var(--color-secondary)" />
                </div>
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e?.target?.value)}
                  placeholder="Buscar clasificados..."
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
              onChange={handleCategoryChange}
              type="ads"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
          <div className="flex gap-6">
            {/* Sidebar Filter (desktop) */}
            <aside className="hidden lg:block w-64 shrink-0">
              <FilterPanel
                filters={filters}
                onChange={handleFilterChange}
                onReset={handleReset}
              />
            </aside>

            {/* Results */}
            <div className="flex-1 min-w-0">
              <SortBar
                count={totalCount}
                sort={sort}
                onSortChange={setSort}
                onMobileFilterOpen={() => setMobileFilterOpen(true)}
              />

              {loading && ads?.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                  {Array.from({ length: PAGE_SIZE })?.map((_, i) => (
                    <AdCardSkeleton key={i} />
                  ))}
                </div>
              ) : ads?.length === 0 ? (
                <EmptyState onReset={handleReset} />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                    {ads?.map((ad) => (
                      <AdCard key={ad?.id} ad={ad} />
                    ))}
                    {loading && Array.from({ length: 3 })?.map((_, i) => (
                      <AdCardSkeleton key={`sk-${i}`} />
                    ))}
                  </div>
                  {hasMore && !loading && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={handleLoadMore}
                        className="px-6 py-2.5 rounded-md border border-border bg-card text-sm font-caption font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        Cargar más clasificados
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Mobile Filter Panel */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-[200] bg-black bg-opacity-50 lg:hidden" onClick={() => setMobileFilterOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-[320px] bg-card p-4 overflow-y-auto overflow-x-hidden" onClick={e => e?.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-semibold text-foreground">Filtros</h2>
              <button onClick={() => setMobileFilterOpen(false)} className="p-2 rounded-md hover:bg-muted">
                <Icon name="X" size={20} color="currentColor" />
              </button>
            </div>
            <FilterPanel
              filters={filters}
              onChange={handleFilterChange}
              onReset={handleReset}
            />
          </div>
        </div>
      )}
    </div>
  );
}