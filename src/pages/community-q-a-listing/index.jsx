import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageMeta from 'components/PageMeta';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import { communityService } from '../../services/communityService';
import { useAuth } from '../../contexts/AuthContext';
import SearchHero from './components/SearchHero';
import SectorFilterPills from './components/SectorFilterPills';
import TrendingBlock from './components/TrendingBlock';
import QuestionRow from './components/QuestionRow';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recientes' },
  { value: 'votes', label: 'Más votados' },
  { value: 'unanswered', label: 'Sin responder' },
];

const PAGE_SIZE = 20;

export default function CommunityQAListing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');
  const [sort, setSort] = useState('recent');
  const [posts, setPosts] = useState([]);
  const [coverImages, setCoverImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const goToAsk = () => {
    if (!user) { navigate('/login', { state: { from: '/comunidad/nueva' } }); return; }
    navigate('/comunidad/nueva');
  };

  const load = useCallback(async (pg = 1, append = false) => {
    setLoading(true);
    try {
      const { data, count } = await communityService.getPosts({
        sector,
        search,
        sort,
        page: pg,
        pageSize: PAGE_SIZE,
      });
      const newPosts = data || [];
      if (append) {
        setPosts(prev => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }
      setTotalCount(count || 0);

      if (newPosts.length) {
        const ids = newPosts.map(p => p.id);
        communityService.getPostsWithImages(ids).then(map => {
          setCoverImages(prev => ({ ...prev, ...map }));
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
    const timer = setTimeout(() => load(1, false), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    load(next, true);
  };

  const handleSectorChange = (s) => {
    setSector(s);
    setPage(1);
  };

  const hasMore = posts.length < totalCount;
  const showTrending = !search;

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <PageMeta
        title="Pregúntale a Coronel"
        description="Preguntas, recomendaciones y respuestas de la comunidad en Coronel."
        path={location.pathname + (location.search || '')}
      />
      <Header />
      <div style={{ paddingTop: '64px' }}>
        <SearchHero value={search} onChange={setSearch} onAskQuestion={goToAsk} />

        <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-5 space-y-6">
          <SectorFilterPills value={sector} onChange={handleSectorChange} />

          {showTrending && <TrendingBlock sector={sector} />}

          {/* All questions */}
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-sm font-heading font-semibold text-foreground">
                {search ? `Resultados para "${search}"` : 'Todas las preguntas'}
                {!loading && (
                  <span className="font-normal text-muted-foreground ml-1.5">({totalCount})</span>
                )}
              </h2>
              <div className="flex items-center gap-1">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSort(opt.value); setPage(1); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                      sort === opt.value ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                    }`}
                    style={sort === opt.value ? { background: 'var(--color-accent)' } : {}}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {loading && posts.length === 0 ? (
                <div className="divide-y divide-border">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="px-4 py-3 animate-pulse flex items-center gap-3" style={{ minHeight: '64px' }}>
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-14 px-4">
                  <Icon name="MessageCircleOff" size={32} color="var(--color-muted-foreground)" className="mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm mb-4">
                    {search
                      ? `No se encontraron preguntas para "${search}"`
                      : sort === 'unanswered'
                      ? 'Todas las preguntas tienen respuesta 🎉'
                      : 'No hay preguntas aún'
                    }
                  </p>
                  <Button variant="default" iconName="Plus" iconPosition="left" iconSize={16} onClick={goToAsk}>
                    {search ? `Preguntar sobre "${search}"` : 'Hacer la primera pregunta'}
                  </Button>
                </div>
              ) : (
                posts.map(post => (
                  <QuestionRow key={post.id} post={post} coverImage={coverImages[post.id]} />
                ))
              )}
            </div>

            {hasMore && (
              <div className="text-center mt-4">
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
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={goToAsk}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-full text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 z-50"
        style={{ background: 'var(--color-primary)' }}
        aria-label="Hacer una pregunta"
      >
        <Icon name="Plus" size={18} color="white" />
        <span className="hidden sm:inline">Preguntar</span>
      </button>
    </div>
  );
}
