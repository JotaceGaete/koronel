import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PageMeta from 'components/PageMeta';
import Header from 'components/ui/Header';
import SmartSearchInput from 'components/ui/SmartSearchInput';
import Icon from 'components/AppIcon';
import BusinessCard from './components/BusinessCard';
import BusinessCardSkeleton from './components/BusinessCardSkeleton';
import FilterPanel from './components/FilterPanel';
import ResultsHeader from './components/ResultsHeader';
import { businessService } from '../../services/businessService';

const DEFAULT_FILTERS = { rating: 'all', radius: 'all', sort: 'relevance', openNow: false };
const PAGE_SIZE = 6;

export default function BusinessDirectoryListing() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const params = new URLSearchParams(location.search);
  const initialQuery = params?.get('q') || '';
  const initialCategoryKey = params?.get('category') || '';

  const listingPath = location.pathname + (location.search || '');

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedParent, setSelectedParent] = useState('all');
  // Si viene de URL ?category=name_key, se usa para filtrar (permite subcategorías)
  const [selectedCategoryKey, setSelectedCategoryKey] = useState(initialCategoryKey || null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categoryTree, setCategoryTree] = useState([]);
  const [flatCategories, setFlatCategories] = useState([]);
  const loaderRef = useRef(null);

  useEffect(() => {
    loadCategoryTree();
  }, []);

  // Sincronizar búsqueda desde URL (ej. al llegar con ?q= o al usar atrás/adelante)
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('q') || '';
    setSearchQuery(q);
  }, [location.search]);

  const loadCategoryTree = async () => {
    const { data, flat } = await businessService?.getHierarchicalCategories();
    setCategoryTree(data || []);
    setFlatCategories(flat || []);
    // Sincronizar categoría desde URL una vez cargado el árbol
    if (initialCategoryKey?.trim() && (flat || [])?.length > 0) {
      const key = (initialCategoryKey || '').trim().toLowerCase();
      const found = (flat || []).find(c => (c?.name_key || '').toLowerCase() === key);
      if (found) {
        setSelectedCategoryKey(found.name_key);
        setSelectedParent(found.parent_id || found.id);
      }
    }
  };

  // Build category_key filter: if parent selected, include parent + all its children keys
  const buildCategoryFilter = useCallback(() => {
    if (selectedParent === 'all') return 'all';
    const parent = categoryTree?.find(p => p?.id === selectedParent);
    if (!parent) return 'all';
    // Return the parent name_key — we'll filter by parent_id in the query
    return parent?.name_key;
  }, [selectedParent, categoryTree]);

  const fetchBusinesses = useCallback(async (resetPage = false) => {
    setLoading(true);
    const currentPage = resetPage ? 1 : page;

    // Build category filter: prioridad a categoría desde URL (permite subcategorías), sino por padre seleccionado
    let categoryFilter = 'all';
    if (selectedCategoryKey && selectedCategoryKey !== 'all') {
      categoryFilter = selectedCategoryKey;
    } else if (selectedParent !== 'all') {
      const parent = categoryTree?.find(p => p?.id === selectedParent);
      if (parent) categoryFilter = parent?.name_key;
    }

    const { data, count, error } = await businessService?.getAll({
      category: categoryFilter,
      search: searchQuery,
      rating: filters?.rating,
      openNow: filters?.openNow,
      sort: filters?.sort,
      page: currentPage,
      pageSize: PAGE_SIZE,
    });
    if (!error) {
      if (resetPage || currentPage === 1) {
        setBusinesses(data);
      } else {
        setBusinesses(prev => [...prev, ...data]);
      }
      setTotalCount(count);
    }
    setLoading(false);
  }, [selectedParent, selectedCategoryKey, categoryTree, searchQuery, filters, page]);

  useEffect(() => {
    setPage(1);
    fetchBusinesses(true);
  }, [selectedParent, selectedCategoryKey, filters, searchQuery]);

  useEffect(() => {
    if (page > 1) fetchBusinesses(false);
  }, [page]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const handleVerEnMapa = () => {
    const urlParams = new URLSearchParams();
    if (searchQuery?.trim()) urlParams?.set('q', searchQuery?.trim());
    if (selectedParent !== 'all') {
      const parent = categoryTree?.find(p => p?.id === selectedParent);
      if (parent?.name_key) urlParams?.set('cat', parent?.name_key);
    }
    const qs = urlParams?.toString();
    navigate(qs ? `/buscar?${qs}` : '/buscar');
  };

  const activeFilterCount = [
    filters?.rating !== 'all',
    filters?.radius !== 'all',
    filters?.sort !== 'relevance',
    filters?.openNow
  ]?.filter(Boolean)?.length;

  const hasMore = businesses?.length < totalCount;

  const formatBusiness = (b) => {
    const primaryImg = b?.business_images?.find(img => img?.is_primary) || b?.business_images?.[0];
    const image = primaryImg?.storage_path
      ? (primaryImg?.storage_path?.startsWith('http') ? primaryImg?.storage_path : businessService?.getImageUrl(primaryImg?.storage_path))
      : 'https://img.rocket.new/generatedImages/rocket_gen_img_10ae87e68-1772638690271.png';

    // Build category breadcrumb from flat categories
    let parentCategoryName = null;
    let subCategoryName = null;
    if (b?.category_id && flatCategories?.length > 0) {
      const cat = flatCategories?.find(c => c?.id === b?.category_id);
      if (cat) {
        if (cat?.parent_id) {
          const parent = flatCategories?.find(c => c?.id === cat?.parent_id);
          parentCategoryName = parent?.name || null;
          subCategoryName = cat?.name;
        } else {
          parentCategoryName = cat?.name;
        }
      }
    }

    return {
      ...b,
      image,
      imageAlt: primaryImg?.alt_text || `${b?.name} - negocio en Coronel`,
      distance: null,
      parentCategoryName,
      subCategoryName,
    };
  };

  const formattedBusinesses = businesses?.map(formatBusiness);

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <PageMeta title="Directorio de Negocios" description="Busca y descubre negocios en Coronel. Filtros por categoría, valoración y más." path={listingPath} />
      <Header />
      <div style={{ paddingTop: '64px' }}>
        {/* Page Header */}
        <div style={{ background: 'var(--color-primary)' }} className="px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="font-heading font-bold text-xl md:text-2xl lg:text-3xl text-white">
                Directorio de Negocios en Coronel
              </h1>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleVerEnMapa}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
                >
                  <Icon name="MapPin" size={15} color="currentColor" />
                  <span className="hidden sm:inline">Ver en mapa</span>
                  <span className="sm:hidden">Mapa</span>
                </button>
                <button
                  onClick={() => navigate(user ? '/publicar-negocio' : '/login')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
                >
                  <Icon name="Plus" size={16} color="currentColor" />
                  <span className="hidden sm:inline">Publicar mi negocio</span>
                  <span className="sm:hidden">Publicar</span>
                </button>
              </div>
            </div>
            <SmartSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={(q) => {
                setSearchQuery(q || '');
                const params = new URLSearchParams(location.search);
                if (q?.trim()) params.set('q', q.trim());
                else params.delete('q');
                const search = params.toString();
                navigate(search ? `${location.pathname}?${search}` : location.pathname, { replace: true });
              }}
              placeholder="Buscar negocios, categorías o dirección..."
            />
          </div>
        </div>

        {/* Parent Category Filter Pills */}
        <div className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-hide">
              <button
                onClick={() => { setSelectedParent('all'); setSelectedCategoryKey(null); setPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-caption font-medium whitespace-nowrap shrink-0 transition-all min-h-[44px] ${
                  selectedParent === 'all' ?'bg-primary text-primary-foreground shadow-sm' :'bg-card border border-border text-secondary hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon name="LayoutGrid" size={14} color="currentColor" />
                Todos
              </button>
              {categoryTree?.map(cat => (
                <button
                  key={cat?.id}
                  onClick={() => { setSelectedParent(cat?.id); setSelectedCategoryKey(null); setPage(1); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-caption font-medium whitespace-nowrap shrink-0 transition-all min-h-[44px] ${
                    selectedParent === cat?.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-card border border-border text-secondary hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon name={cat?.icon || 'Tag'} size={14} color="currentColor" />
                  {cat?.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
          <div className="flex gap-6">
            {/* Sidebar Filter (desktop) */}
            <aside className="hidden lg:block w-64 shrink-0">
              <FilterPanel
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={handleReset}
                activeCount={activeFilterCount}
              />
            </aside>

            {/* Results */}
            <div className="flex-1 min-w-0">
              <ResultsHeader
                count={totalCount}
                loading={loading}
                sort={filters?.sort}
                onSortChange={(v) => handleFilterChange('sort', v)}
                onMobileFilterOpen={() => setMobileFiltersOpen(true)}
                activeFilterCount={activeFilterCount}
              />

              {loading && businesses?.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6 mt-4">
                  {Array.from({ length: PAGE_SIZE })?.map((_, i) => (
                    <BusinessCardSkeleton key={i} />
                  ))}
                </div>
              ) : formattedBusinesses?.length === 0 ? (
                <div className="py-16 text-center">
                  <Icon name="Building2" size={48} color="var(--color-muted-foreground)" className="mx-auto mb-4" />
                  <p className="font-heading font-semibold text-foreground mb-2">No se encontraron negocios</p>
                  <p className="text-sm font-caption text-muted-foreground">Intenta con otros filtros o términos de búsqueda.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6 mt-4">
                    {formattedBusinesses?.map((business) => (
                      <BusinessCard key={business?.id} business={business} />
                    ))}
                    {loading && Array.from({ length: 3 })?.map((_, i) => (
                      <BusinessCardSkeleton key={`sk-${i}`} />
                    ))}
                  </div>
                  {hasMore && !loading && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => setPage(p => p + 1)}
                        className="px-6 py-2.5 rounded-md border border-border bg-card text-sm font-caption font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        Cargar más negocios
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
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[200] bg-black bg-opacity-50 lg:hidden" onClick={() => setMobileFiltersOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-card p-4 overflow-y-auto" onClick={e => e?.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-semibold text-foreground">Filtros</h2>
              <button onClick={() => setMobileFiltersOpen(false)} className="p-2 rounded-md hover:bg-muted">
                <Icon name="X" size={20} color="currentColor" />
              </button>
            </div>
            <FilterPanel
              filters={filters}
              onFilterChange={handleFilterChange}
              onReset={handleReset}
              activeCount={activeFilterCount}
            />
          </div>
        </div>
      )}
    </div>
  );
}