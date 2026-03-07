import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import { communityService } from '../../services/communityService';
import { useAuth } from '../../contexts/AuthContext';
import QuestionHeader from './components/QuestionHeader';
import ReplyCard from './components/ReplyCard';
import ReplyForm from './components/ReplyForm';

export default function CommunityQuestionDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [votedPostIds, setVotedPostIds] = useState(new Set());
  const [votedReplyIds, setVotedReplyIds] = useState(new Set());
  const [voteLoading, setVoteLoading] = useState(null);

  const loadPost = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await communityService?.getPostById(id);
      if (error || !data) { setNotFound(true); return; }
      setPost(data);

      const { data: replyData } = await communityService?.getRepliesByPostId(id);
      setReplies(replyData || []);

      // Load user votes
      if (user?.id) {
        const allIds = [id, ...(replyData || [])?.map(r => r?.id)];
        const { data: postVotes } = await communityService?.getUserVotes(user?.id, [id], 'post');
        const { data: replyVotes } = await communityService?.getUserVotes(user?.id, (replyData || [])?.map(r => r?.id), 'reply');
        setVotedPostIds(new Set((postVotes || [])?.map(v => v?.target_id)));
        setVotedReplyIds(new Set((replyVotes || [])?.map(v => v?.target_id)));
      }
    } catch (e) {
      console.error(e);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => { loadPost(); }, [loadPost]);

  const handlePostVote = async () => {
    if (!user || !post) return;
    setVoteLoading('post');
    const hasVoted = votedPostIds?.has(post?.id);
    const { voted, newCount } = await communityService?.toggleVote({
      userId: user?.id,
      targetType: 'post',
      targetId: post?.id,
      currentCount: post?.upvote_count || 0,
      hasVoted,
    });
    setPost(prev => ({ ...prev, upvote_count: newCount }));
    setVotedPostIds(prev => {
      const next = new Set(prev);
      voted ? next?.add(post?.id) : next?.delete(post?.id);
      return next;
    });
    setVoteLoading(null);
  };

  const handleReplyVote = async (reply) => {
    if (!user || !reply) return;
    setVoteLoading(reply?.id);
    const hasVoted = votedReplyIds?.has(reply?.id);
    const { voted, newCount } = await communityService?.toggleVote({
      userId: user?.id,
      targetType: 'reply',
      targetId: reply?.id,
      currentCount: reply?.upvote_count || 0,
      hasVoted,
    });
    setReplies(prev => prev?.map(r => r?.id === reply?.id ? { ...r, upvote_count: newCount } : r));
    setVotedReplyIds(prev => {
      const next = new Set(prev);
      voted ? next?.add(reply?.id) : next?.delete(reply?.id);
      return next;
    });
    setVoteLoading(null);
  };

  const handleReplySubmitted = (newReply) => {
    if (newReply) {
      setReplies(prev => [newReply, ...prev]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
        <Header />
        <div style={{ paddingTop: '64px' }}>
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-24 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
        <Header />
        <div className="flex items-center justify-center min-h-screen" style={{ paddingTop: '64px' }}>
          <div className="text-center">
            <Icon name="MessageCircleOff" size={40} color="var(--color-muted-foreground)" className="mx-auto mb-4" />
            <h2 className="font-heading font-bold text-foreground mb-2">Pregunta no encontrada</h2>
            <Link to="/comunidad"><Button variant="outline">Ver comunidad</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <Header />
      <div style={{ paddingTop: '64px' }}>
        {/* Breadcrumb */}
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-3">
          <nav className="flex items-center gap-1.5 text-xs font-caption text-muted-foreground flex-wrap">
            <Link to="/homepage" className="hover:text-primary transition-colors">Inicio</Link>
            <Icon name="ChevronRight" size={12} color="currentColor" />
            <Link to="/comunidad" className="hover:text-primary transition-colors">Comunidad</Link>
            <Icon name="ChevronRight" size={12} color="currentColor" />
            <span className="text-foreground truncate max-w-[200px]">{post?.title}</span>
          </nav>
        </div>

        <div className="max-w-3xl mx-auto px-4 md:px-6 pb-16 space-y-5">
          {/* Question */}
          <QuestionHeader
            post={post}
            hasVoted={votedPostIds?.has(post?.id)}
            onVote={handlePostVote}
            voteLoading={voteLoading === 'post'}
            user={user}
          />

          {/* Replies Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Icon name="MessageSquare" size={18} color="var(--color-primary)" />
              <h2 className="font-heading font-semibold text-foreground">
                {replies?.length} {replies?.length === 1 ? 'Respuesta' : 'Respuestas'}
              </h2>
            </div>

            {replies?.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <Icon name="MessageSquarePlus" size={28} color="var(--color-muted-foreground)" className="mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Aún no hay respuestas. ¡Sé el primero en responder!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {replies?.map(reply => (
                  <ReplyCard
                    key={reply?.id}
                    reply={reply}
                    hasVoted={votedReplyIds?.has(reply?.id)}
                    onVote={() => handleReplyVote(reply)}
                    voteLoading={voteLoading === reply?.id}
                    user={user}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Reply Form */}
          <ReplyForm
            postId={id}
            user={user}
            onReplySubmitted={handleReplySubmitted}
          />
        </div>
      </div>
    </div>
  );
}
