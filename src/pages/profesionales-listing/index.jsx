import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import PageMeta from 'components/PageMeta';
import Header from 'components/ui/Header';
import CategoryFilter from 'components/ui/CategoryFilter';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import AdCardSkeleton from '../classified-ads-listing/components/AdCardSkeleton';
import EmptyState from '../classified-ads-listing/components/EmptyState';
import SortBar from '../classified-ads-listing/components/SortBar';
import ProfesionalCard from './components/ProfesionalCard';
import { adService } from '../../services/adService';
import { useCity } from '../../contexts/CityContext';

const PAGE_SIZE = 8;

export default function ProfesionalesListing() {
  const location = useLocation();
  const { communityCityId } = useCity();
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
  const requestIdRef = useRef(0);

  const fetchAds = useCallback(async (resetPage = false) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    const currentPage = resetPage ? 1 : page;
    const { data, count, error } = await adService?.getAll({
      listingType: 'oficio',
      category: selectedCategory,
      search: searchQuery,
      sort,
      page: currentPage,
      pageSize: PAGE_SIZE,
      communityCityId,
    });
    if (requestId !== requestIdRef.current) return;
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
  }, [selectedCategory, searchQuery, sort, page, communityCityId]);

  // Limpia de inmediato al cambiar de ciudad: evita que, mientras resuelve
  // la ciudad nueva, queden visibles profesionales de la ciudad anterior.
  useEffect(() => {
    setAds([]);
  }, [communityCityId]);

  useEffect(() => {
    setPage(1);
    fetchAds(true);
  }, [selectedCategory, searchQuery, sort, communityCityId]);

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
      <PageMeta
        title="Profesionales de Coronel"
        description="Encuentra gasfíteres, abogados, psicólogos y más servicios en tu ciudad."
        path={listingPath}
      />
      <Header />
      <div style={{ paddingTop: '64px' }}>
        {/* Page Header */}
        <div style={{ background: 'var(--color-primary)' }} className="px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Icon name="UserCheck" size={18} color="white" />
              </div>
              <h1 className="font-heading font-bold text-xl md:text-2xl lg:text-3xl text-white">
                Profesionales de Coronel
              </h1>
            </div>
            <p className="text-white/80 text-sm mb-4 ml-12">
              Encuentra gasfíteres, abogados, psicólogos y más servicios en tu ciudad.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <Link
                to="/profesionales/publicar"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-caption font-semibold text-primary bg-white hover:bg-white/90 transition-all self-start"
              >
                <Icon name="Plus" size={15} color="currentColor" />
                Presentarme como profesional
              </Link>
            </div>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="flex-1 flex items-center bg-card rounded-md overflow-hidden border border-border shadow-sm h-11">
                <div className="pl-3 shrink-0">
                  <Icon name="Search" size={18} color="var(--color-secondary)" />
                </div>
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e?.target?.value)}
                  placeholder="Buscar gasfíter, abogado, psicólogo..."
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
                  <ProfesionalCard key={ad?.id} ad={ad} />
                ))}
                {loading && Array.from({ length: 3 })?.map((_, i) => <AdCardSkeleton key={`sk-${i}`} />)}
              </div>
              {hasMore && !loading && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setPage(p => p + 1)}
                    className="px-6 py-2.5 rounded-md border border-border bg-card text-sm font-caption font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    Cargar más profesionales
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
