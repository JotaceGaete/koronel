import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import { communityService } from '../../services/communityService';
import { useAuth } from '../../contexts/AuthContext';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'votes', label: 'Más votados' },
  { value: 'unanswered', label: 'Sin respuesta' },
];

function formatRelativeDate(dateStr) {
  if (!dateStr) return '';
  try {
    const diff = Date.now() - new Date(dateStr)?.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `hace ${days}d`;
    return new Date(dateStr)?.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

function QuestionCard({ post, coverImage }) {
  const bodySnippet = post?.body?.length > 120 ? post?.body?.slice(0, 120) + '...' : post?.body;

  return (
    <div className="bg-card border border-border rounded-xl hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col overflow-hidden">
      {/* Cover image */}
      {coverImage && (
        <Link to={`/comunidad/${post?.id}`} className="block w-full h-36 overflow-hidden flex-shrink-0">
          <img
            src={coverImage}
            alt={`Imagen de la pregunta: ${post?.title}`}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </Link>
      )}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {post?.lat && post?.lng && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Icon name="Navigation" size={11} color="currentColor" />
                  Con ubicación
                </span>
              )}
            </div>
            <Link to={`/comunidad/${post?.id}`}>
              <h3 className="font-heading font-semibold text-foreground text-base leading-snug hover:text-primary transition-colors line-clamp-2 mb-1">
                {post?.title}
              </h3>
            </Link>
            <p className="text-sm text-muted-foreground line-clamp-2">{bodySnippet}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--color-primary)' }}>
                {post?.author?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <span className="text-xs text-muted-foreground">{post?.author?.full_name || 'Usuario'}</span>
            </div>
            <span className="text-xs text-muted-foreground">{formatRelativeDate(post?.created_at)}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Icon name="MessageSquare" size={13} color="currentColor" />
              <span>{post?.reply_count || 0}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Icon name="ThumbsUp" size={13} color="currentColor" />
              <span>{post?.upvote_count || 0}</span>
            </div>
            {coverImage && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Icon name="Image" size={11} color="currentColor" />
              </span>
            )}
            {post?.lat && post?.lng && (
              <Link
                to="/mapa"
                className="flex items-center gap-1 text-xs font-medium transition-colors hover:underline"
                style={{ color: 'var(--color-primary)' }}
                onClick={e => e?.stopPropagation()}
              >
                <Icon name="Map" size={12} color="currentColor" />
                Ver en mapa
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CommunityQAListing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [coverImages, setCoverImages] = useState({});
  const PAGE_SIZE = 12;

  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const { data, count } = await communityService?.getPosts({
        sector: '',
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, sort]);

  useEffect(() => {
    setPage(1);
    const timer = setTimeout(() => load(1), 300);
    return () => clearTimeout(timer);
  }, [load]);

  // After posts load, fetch cover images
  const loadCoverImages = async (posts) => {
    if (!posts?.length) return;
    const ids = posts?.map(p => p?.id);
    const map = await communityService?.getPostsWithImages(ids);
    setCoverImages(map || {});
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    load(nextPage);
  };

  const hasMore = posts?.length < totalCount;

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <Header />
      <div style={{ paddingTop: '64px' }}>
        {/* Page Header */}
        <div className="w-full py-8 md:py-10" style={{ background: 'var(--color-muted)' }}>
          <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Icon name="MessageCircle" size={22} color="var(--color-primary)" />
                  <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Preguntas a la Comunidad</h1>
                </div>
                <p className="text-muted-foreground text-sm">Consultas y recomendaciones en Coronel</p>
              </div>
              <Button
                variant="default"
                iconName="Plus"
                iconPosition="left"
                iconSize={16}
                onClick={() => {
                  if (!user) { navigate('/login', { state: { from: '/comunidad/nueva' } }); return; }
                  navigate('/comunidad/nueva');
                }}
              >
                Hacer una pregunta
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="sticky top-16 z-10 bg-card border-b border-border shadow-sm">
          <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-3 space-y-3">
            {/* Search */}
            <div className="relative">
              <Icon name="Search" size={16} color="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e?.target?.value)}
                placeholder="Buscar preguntas..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Ordenar:</span>
              {SORT_OPTIONS?.map(opt => (
                <button
                  key={opt?.value}
                  onClick={() => setSort(opt?.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 ${
                    sort === opt?.value ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                  style={sort === opt?.value ? { background: 'var(--color-accent)' } : {}}
                >
                  {opt?.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-8">
          {loading && posts?.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 })?.map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-2/3" />
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
              <Button
                variant="default"
                iconName="Plus"
                iconPosition="left"
                iconSize={16}
                onClick={() => {
                  if (!user) { navigate('/login', { state: { from: '/comunidad/nueva' } }); return; }
                  navigate('/comunidad/nueva');
                }}
              >
                Hacer la primera pregunta
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">{totalCount} pregunta{totalCount !== 1 ? 's' : ''}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {posts?.map(post => {
                  const coverImage = coverImages?.[post?.id];
                  return <QuestionCard key={post?.id} post={post} coverImage={coverImage} />;
                })}
              </div>
              {hasMore && (
                <div className="text-center mt-8">
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
      </div>
    </div>
  );
}
