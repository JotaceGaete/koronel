import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageMeta from 'components/PageMeta';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import { communityService } from '../../services/communityService';
import { useAuth } from '../../contexts/AuthContext';
import QuestionCard from './components/QuestionCard';
import SectorChips from './components/SectorChips';
import CommunityStatsStrip from './components/CommunityStatsStrip';
import CommunitySidebar from './components/CommunitySidebar';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recientes' },
  { value: 'votes', label: 'Más votadas' },
  { value: 'unanswered', label: 'Sin respuesta' },
];

export default function CommunityQAListing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('all');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [coverImages, setCoverImages] = useState({});
  const [sectorCounts, setSectorCounts] = useState({});
  const PAGE_SIZE = 16;

  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const { data, count } = await communityService?.getPosts({
        sector,
        search,
        sort,
        page: pg,
        pageSize: PAGE_SIZE,
      });
      if (pg === 1) {
        setPosts(data || []);
      } else {
        setPosts(prev => [...prev, ...(data || [])]);
      }
      setTotalCount(count || 0);

      const ids = (data || [])?.map(p => p?.id);
      if (ids?.length) {
        communityService?.getPostsWithImages(ids)?.then(map => {
          setCoverImages(prev => (pg === 1 ? map : { ...prev, ...map }));
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, sector, sort]);

  useEffect(() => {
    setPage(1);
    const timer = setTimeout(() => load(1), 300);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    communityService?.getSectorCounts()?.then(({ data }) => setSectorCounts(data || {}));
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    load(nextPage);
  };

  const handleAsk = () => {
    if (!user) { navigate('/login', { state: { from: '/comunidad/nueva' } }); return; }
    navigate('/comunidad/nueva');
  };

  const totalSectorCount = Object.values(sectorCounts)?.reduce((a, b) => a + b, 0);
  const hasMore = posts?.length < totalCount;

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <PageMeta title="Comunidad" description="Preguntas, recomendaciones y conversaciones de la comunidad en Coronel." path={location.pathname + (location.search || '')} />
      <Header />
      <div style={{ paddingTop: '64px' }}>

        {/* Compact hero */}
        <div
          className="w-full py-5 md:py-6"
          style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 8%, var(--color-background)), color-mix(in srgb, var(--color-accent) 6%, var(--color-background)))' }}
        >
          <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Icon name="MessageCircle" size={20} color="var(--color-primary)" />
                <h1 className="text-xl md:text-2xl font-heading font-bold text-foreground">Comunidad</h1>
                <span className="text-sm text-muted-foreground hidden sm:inline">— preguntas y recomendaciones de Coronel</span>
              </div>
              <Button variant="default" iconName="Plus" iconPosition="left" iconSize={16} onClick={handleAsk}>
                Hacer una pregunta
              </Button>
            </div>
            <CommunityStatsStrip />
          </div>
        </div>

        {/* Filters */}
        <div className="sticky top-16 z-10 bg-card border-b border-border shadow-sm">
          <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-2.5 space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Icon name="Search" size={16} color="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e?.target?.value)}
                  placeholder="Buscar preguntas..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {SORT_OPTIONS?.map(opt => (
                  <button
                    key={opt?.value}
                    onClick={() => setSort(opt?.value)}
                    className={`px-3 py-2 rounded-md text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                      sort === opt?.value ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                    style={sort === opt?.value ? { background: 'var(--color-accent)' } : {}}
                  >
                    {opt?.label}
                  </button>
                ))}
              </div>
            </div>
            <SectorChips sector={sector} onChange={setSector} counts={sectorCounts} totalCount={totalSectorCount} />
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-5 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
          <div className="min-w-0">
          {loading && posts?.length === 0 ? (
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: 8 })?.map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-lg p-3.5 animate-pulse flex gap-3">
                  <div className="w-14 h-10 bg-muted rounded-md shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded w-1/5" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts?.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--color-muted)' }}>
                <Icon name="MessageCircleOff" size={28} color="var(--color-muted-foreground)" />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-2">No hay preguntas aún</h3>
              <p className="text-muted-foreground text-sm mb-6">
                {search ? `No se encontraron preguntas para "${search}"` : 'Sé el primero en hacer una pregunta a la comunidad'}
              </p>
              <Button variant="default" iconName="Plus" iconPosition="left" iconSize={16} onClick={handleAsk}>
                Hacer la primera pregunta
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">{totalCount} pregunta{totalCount !== 1 ? 's' : ''}</p>
              <div className="flex flex-col gap-2.5">
                {posts?.map(post => (
                  <QuestionCard key={post?.id} post={post} coverImage={coverImages?.[post?.id]} />
                ))}
              </div>
              {hasMore && (
                <div className="text-center mt-6">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={loading}
                    iconName={loading ? undefined : 'ChevronDown'}
                    iconPosition="right"
                    iconSize={16}
                  >
                    {loading ? 'Cargando...' : 'Cargar más'}
                  </Button>
                </div>
              )}
            </>
          )}
          </div>

          <CommunitySidebar onSearchWord={setSearch} />
        </div>
      </div>
    </div>
  );
}
