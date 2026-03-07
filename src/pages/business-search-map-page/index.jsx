import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import { businessService } from '../../services/businessService';
import SearchMapLeftPanel from './components/SearchMapLeftPanel';
import SearchMapRightPanel from './components/SearchMapRightPanel';

const LIMIT = 50;

export default function BusinessSearchMapPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const getParams = () => new URLSearchParams(location.search);

  const [searchQuery, setSearchQuery] = useState(() => getParams()?.get('q') || '');
  const [selectedParent, setSelectedParent] = useState(() => getParams()?.get('cat') || 'all');
  const [categoryTree, setCategoryTree] = useState([]);
  const [flatCategories, setFlatCategories] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  const [mobileView, setMobileView] = useState('list');

  const cardRefs = useRef({});
  const mapRef = useRef(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data, flat } = await businessService?.getHierarchicalCategories();
    setCategoryTree(data || []);
    setFlatCategories(flat || []);
  };

  const syncUrl = useCallback(
    (q, cat) => {
      const params = new URLSearchParams();
      if (q) params?.set('q', q);
      if (cat && cat !== 'all') params?.set('cat', cat);
      const newSearch = params?.toString();
      window.history?.replaceState(
        null,
        '',
        newSearch ? `${location?.pathname}?${newSearch}` : location?.pathname
      );
    },
    [location?.pathname]
  );

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    let categoryFilter = 'all';
    if (selectedParent !== 'all') {
      const parent = categoryTree?.find((p) => p?.id === selectedParent);
      if (parent) categoryFilter = parent?.name_key;
    }
    const { data, error } = await businessService?.getAll({
      category: categoryFilter,
      search: searchQuery,
      page: 1,
      pageSize: LIMIT,
    });
    if (!error) setBusinesses(data || []);
    setLoading(false);
  }, [selectedParent, categoryTree, searchQuery]);

  useEffect(() => {
    fetchBusinesses();
    syncUrl(searchQuery, selectedParent);
  }, [selectedParent, searchQuery, categoryTree]);

  const formatBusiness = useCallback(
    (b) => {
      const primaryImg =
        b?.business_images?.find((img) => img?.is_primary) || b?.business_images?.[0];
      const image = primaryImg?.storage_path
        ? primaryImg?.storage_path?.startsWith('http')
          ? primaryImg?.storage_path
          : businessService?.getImageUrl(primaryImg?.storage_path)
        : 'https://img.rocket.new/generatedImages/rocket_gen_img_10ae87e68-1772638690271.png';

      let parentCategoryName = null;
      let subCategoryName = null;
      if (b?.category_id && flatCategories?.length > 0) {
        const cat = flatCategories?.find((c) => c?.id === b?.category_id);
        if (cat) {
          if (cat?.parent_id) {
            const parent = flatCategories?.find((c) => c?.id === cat?.parent_id);
            parentCategoryName = parent?.name || null;
            subCategoryName = cat?.name;
          } else {
            parentCategoryName = cat?.name;
          }
        }
      }

      const rawLat = b?.lat ?? b?.latitude;
      const rawLng = b?.lng ?? b?.longitude;

      return {
        ...b,
        image,
        imageAlt: primaryImg?.alt_text || `${b?.name} - negocio en Coronel`,
        parentCategoryName,
        subCategoryName,
        lat: rawLat != null ? parseFloat(rawLat) : null,
        lng: rawLng != null ? parseFloat(rawLng) : null,
      };
    },
    [flatCategories]
  );

  const formattedBusinesses = businesses?.map(formatBusiness);

  const handleCardClick = useCallback(
    (business) => {
      setSelectedId(business?.id);
      if (business?.lat != null && business?.lng != null) {
        setFlyTarget({ lat: business?.lat, lng: business?.lng, id: business?.id });
        if (mobileView === 'list') setMobileView('map');
      }
    },
    [mobileView]
  );

  const handleMarkerClick = useCallback((business) => {
    setSelectedId(business?.id);
    setMobileView('list');
    setTimeout(() => {
      const el = cardRefs?.current?.[business?.id];
      if (el) el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 150);
  }, []);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setSelectedId(null);
  };

  const handleSelectParent = (id) => {
    setSelectedParent(id);
    setSelectedId(null);
  };

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: '100vh', background: 'var(--color-background)' }}
    >
      <Header />

      {/* Mobile toggle bar */}
      <div
        className="flex md:hidden items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0"
        style={{ marginTop: '64px' }}
      >
        <span className="text-sm font-caption font-medium text-foreground">
          {loading ? 'Cargando...' : `${formattedBusinesses?.length} negocios`}
        </span>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setMobileView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-caption font-medium transition-all ${
              mobileView === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
            }`}
          >
            <Icon name="List" size={13} color="currentColor" />
            Ver lista
          </button>
          <button
            onClick={() => setMobileView('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-caption font-medium transition-all ${
              mobileView === 'map' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
            }`}
          >
            <Icon name="Map" size={13} color="currentColor" />
            Ver mapa
          </button>
        </div>
      </div>

      {/* Main split layout */}
      <div
        className="flex flex-1 overflow-hidden"
        style={{ marginTop: '64px' }}
      >
        {/* Left panel — 40% desktop, full mobile */}
        <div
          className={`${
            mobileView === 'list' ? 'flex' : 'hidden'
          } md:flex flex-col border-r border-border bg-card overflow-hidden`}
          style={{ width: '100%', flexShrink: 0 }}
        >
          {/* Use inline style for responsive width */}
          <style>{`
            @media (min-width: 768px) {
              .buscar-left { width: 40% !important; }
            }
          `}</style>
          <div className="buscar-left flex flex-col h-full w-full overflow-hidden">
            <SearchMapLeftPanel
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              categoryTree={categoryTree}
              selectedParent={selectedParent}
              onSelectParent={handleSelectParent}
              businesses={formattedBusinesses}
              loading={loading}
              selectedId={selectedId}
              onCardClick={handleCardClick}
              cardRefs={cardRefs}
            />
          </div>
        </div>

        {/* Right panel — map, fills remaining space */}
        <div
          className={`${
            mobileView === 'map' ? 'flex' : 'hidden'
          } md:flex flex-1 relative overflow-hidden`}
          style={{ minWidth: 0, minHeight: 0 }}
        >
          <SearchMapRightPanel
            businesses={formattedBusinesses}
            selectedId={selectedId}
            onMarkerClick={handleMarkerClick}
            flyTarget={flyTarget}
            onMapReady={(map) => {
              mapRef.current = map;
            }}
          />
        </div>
      </div>
    </div>
  );
}
