import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import { communityService } from '../../services/communityService';
import ReplyCard from './components/ReplyCard';
import ReplyForm from './components/ReplyForm';
import ShareButtons from 'components/ui/ShareButtons';

const SECTOR_COLORS = {
  'Centro': { bg: '#dbeafe', color: '#1d4ed8' },
  'Lagunillas': { bg: '#dcfce7', color: '#15803d' },
  'Schwager': { bg: '#fef3c7', color: '#b45309' },
  'Puchoco': { bg: '#fce7f3', color: '#be185d' },
  'Las Higueras': { bg: '#ede9fe', color: '#7c3aed' },
  'Punta de Parra': { bg: '#ffedd5', color: '#c2410c' },
  'Otro': { bg: '#f1f5f9', color: '#475569' },
};

export default function CommunityDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [postVoted, setPostVoted] = useState(false);
  const [replyVotes, setReplyVotes] = useState({});
  const [voteLoading, setVoteLoading] = useState(false);

  const loadPost = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [postResult, repliesResult] = await Promise.all([
        communityService?.getPostById(id),
        communityService?.getRepliesByPost(id),
      ]);
      const { data: postData, error: postErr } = postResult;
      const { data: repliesData, error: repliesErr } = repliesResult;
      if (postErr) throw postErr;
      if (repliesErr) throw repliesErr;
      setPost(postData);
      setReplies(repliesData || []);

      // Load user votes
      if (user?.id) {
        const allIds = [id, ...(repliesData || [])?.map(r => r?.id)];
        const { data: votes } = await communityService?.getUserVotes(user?.id, allIds);
        const votedMap = {};
        (votes || [])?.forEach(v => { votedMap[v?.target_id] = true; });
        setPostVoted(!!votedMap?.[id]);
        const replyVoteMap = {};
        (repliesData || [])?.forEach(r => { replyVoteMap[r?.id] = !!votedMap?.[r?.id]; });
        setReplyVotes(replyVoteMap);
      }
    } catch (e) {
      setError(e?.message || 'Error al cargar la pregunta');
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    if (id) loadPost();
  }, [id, loadPost]);

  const handlePostVote = async () => {
    if (!user) { navigate('/login'); return; }
    if (voteLoading) return;
    setVoteLoading(true);
    const { voted } = await communityService?.votePost({
      userId: user?.id,
      postId: id,
      currentlyVoted: postVoted,
    });
    setPostVoted(voted);
    setPost(prev => ({
      ...prev,
      upvote_count: postVoted
        ? Math.max(0, (prev?.upvote_count || 0) - 1)
        : (prev?.upvote_count || 0) + 1,
    }));
    setVoteLoading(false);
  };

  const handleReplyVote = async (replyId, currentlyVoted) => {
    if (!user) { navigate('/login'); return; }
    const { voted } = await communityService?.voteReply({
      userId: user?.id,
      replyId,
      currentlyVoted,
    });
    setReplyVotes(prev => ({ ...prev, [replyId]: voted }));
    setReplies(prev => prev?.map(r =>
      r?.id === replyId
        ? { ...r, upvote_count: currentlyVoted ? Math.max(0, (r?.upvote_count || 0) - 1) : (r?.upvote_count || 0) + 1 }
        : r
    ));
  };

  const handleReplyAdded = () => {
    loadPost();
  };

  const sectorStyle = SECTOR_COLORS?.[post?.sector] || SECTOR_COLORS?.['Otro'];
  const authorName = post?.user?.full_name || 'Usuario';
  const initials = authorName?.split(' ')?.map(n => n?.[0])?.slice(0, 2)?.join('')?.toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div style={{ paddingTop: '64px' }} className="max-w-3xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-24 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div style={{ paddingTop: '64px' }} className="max-w-3xl mx-auto px-4 py-8 text-center">
          <Icon name="AlertCircle" size={40} color="var(--color-muted-foreground)" className="mx-auto mb-3" />
          <h2 className="text-xl font-heading font-bold text-foreground mb-2">Pregunta no encontrada</h2>
          <p className="text-muted-foreground text-sm mb-6">{error || 'Esta pregunta no existe o fue eliminada.'}</p>
          <Link to="/comunidad" className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
            <Icon name="ArrowLeft" size={16} color="currentColor" />
            Volver a la comunidad
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div style={{ paddingTop: '64px' }}>
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Back */}
          <Link
            to="/comunidad"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <Icon name="ArrowLeft" size={16} color="currentColor" />
            Preguntas a la Comunidad
          </Link>

          {/* Post Card */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-sm">
            {/* Sector + Map button */}
            <div className="flex items-center justify-between mb-4">
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: sectorStyle?.bg, color: sectorStyle?.color }}
              >
                <Icon name="MapPin" size={11} color="currentColor" className="mr-1" />
                {post?.sector}
              </span>
              {post?.lat && post?.lng && (
                <Link
                  to={`/mapa?sector=${encodeURIComponent(post?.sector)}`}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors"
                  style={{ color: 'var(--color-primary)' }}
                >
                  <Icon name="Map" size={13} color="currentColor" />
                  Ver negocios y eventos cercanos
                </Link>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-heading font-bold text-foreground mb-3 leading-snug">
              {post?.title}
            </h1>

            {/* Body */}
            <p className="text-foreground leading-relaxed mb-5 whitespace-pre-wrap">{post?.body}</p>

            {/* Author + Stats */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {post?.user?.avatar_url ? (
                    <img src={post?.user?.avatar_url} alt={authorName} className="w-full h-full rounded-full object-cover" />
                  ) : initials}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{authorName}</p>
                  <p className="text-xs text-muted-foreground">{communityService?.formatDate(post?.created_at)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Icon name="MessageCircle" size={15} color="currentColor" />
                  {replies?.length} respuesta{replies?.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={handlePostVote}
                  disabled={voteLoading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    postVoted
                      ? 'text-white border-transparent' :'border-border text-muted-foreground hover:border-primary hover:text-primary'
                  } disabled:opacity-50`}
                  style={postVoted ? { background: 'var(--color-primary)' } : {}}
                  title={!user ? 'Inicia sesión para votar' : ''}
                >
                  <Icon name="ThumbsUp" size={15} color="currentColor" />
                  {post?.upvote_count || 0}
                </button>
              </div>
            </div>

            {/* Share */}
            <div className="pt-4 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Icon name="Share2" size={13} color="currentColor" />
                Compartir pregunta
              </p>
              <ShareButtons
                title={post?.title ? `Pregunta: ${post?.title}` : ''}
                url={window?.location?.href}
              />
            </div>
          </div>

          {/* Replies */}
          <div className="mb-6">
            <h2 className="text-lg font-heading font-bold text-foreground mb-4">
              {replies?.length > 0
                ? `${replies?.length} Respuesta${replies?.length !== 1 ? 's' : ''}`
                : 'Sin respuestas aún'}
            </h2>

            {replies?.length === 0 && (
              <div className="text-center py-8 bg-card border border-border rounded-xl">
                <Icon name="MessageCircle" size={32} color="var(--color-muted-foreground)" className="mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">¡Sé el primero en responder esta pregunta!</p>
              </div>
            )}

            <div className="space-y-4">
              {replies?.map(reply => (
                <ReplyCard
                  key={reply?.id}
                  reply={reply}
                  userId={user?.id}
                  hasVoted={!!replyVotes?.[reply?.id]}
                  onVote={handleReplyVote}
                />
              ))}
            </div>
          </div>

          {/* Reply Form */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-heading font-bold text-foreground mb-4 flex items-center gap-2">
              <Icon name="Reply" size={18} color="var(--color-primary)" />
              Responder
            </h3>
            {user ? (
              <ReplyForm
                postId={id}
                userId={user?.id}
                onReplyAdded={handleReplyAdded}
              />
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-4">Inicia sesión para responder esta pregunta</p>
                <div className="flex justify-center gap-3">
                  <Link
                    to="/login"
                    className="px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    Iniciar Sesión
                  </Link>
                  <Link
                    to="/signup"
                    className="px-5 py-2.5 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
                  >
                    Crear Cuenta
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
