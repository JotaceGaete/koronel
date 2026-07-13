import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import PollOptionButton from 'components/community/PollOptionButton';
import PollResultsBar from 'components/community/PollResultsBar';
import PollCountdown from 'components/community/PollCountdown';
import PollStatusBadge from 'components/community/PollStatusBadge';
import { communityService } from '../../../services/communityService';

export default function PollCard({ post, user, userVote, onVoted }) {
  const poll = post?.poll;
  const [localVote, setLocalVote] = useState(userVote || null);
  const [optimisticOptions, setOptimisticOptions] = useState(null);
  const [changingVote, setChangingVote] = useState(false);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState(null);

  // userVote arrives asynchronously (batch-loaded by the listing page after the posts
  // themselves), so it can flip from undefined to a real value after this card already
  // mounted once.
  useEffect(() => { setLocalVote(userVote || null); }, [userVote]);

  const options = optimisticOptions || poll?.options || [];
  const isClosed = communityService?.isPollClosed(poll);
  const totalVotes = options?.reduce((sum, o) => sum + (o?.vote_count || 0), 0);
  const maxVotes = options?.reduce((max, o) => Math.max(max, o?.vote_count || 0), 0);
  const winningOptionId = totalVotes > 0 ? options?.find(o => (o?.vote_count || 0) === maxVotes)?.id : null;
  const showVotable = !isClosed && (!localVote || changingVote);

  const handleSelect = async (optionId) => {
    if (!user || voting) return;
    setVoting(true);
    setVoteError(null);
    const { data, error } = await communityService?.castPollVote({ pollId: poll?.id, optionId });
    if (error) {
      setVoteError(error?.message || 'No se pudo registrar tu voto. Intenta de nuevo.');
    } else {
      setOptimisticOptions(data);
      setLocalVote(optionId);
      setChangingVote(false);
      onVoted?.(poll?.id, optionId);
    }
    setVoting(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col overflow-hidden">
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
              <Icon name="BarChart3" size={12} color="currentColor" />
              Encuesta
            </span>
            <PollStatusBadge isClosed={isClosed} />
          </div>
          <Link to={`/comunidad/${post?.id}`}>
            <h3 className="font-heading font-semibold text-foreground text-base leading-snug hover:text-primary transition-colors line-clamp-2 mb-1">
              {post?.title}
            </h3>
          </Link>
          {post?.body && <p className="text-sm text-muted-foreground line-clamp-2">{post?.body}</p>}
        </div>

        {/* Options or results */}
        <div>
          {showVotable ? (
            !user ? (
              <p className="text-xs text-muted-foreground">
                <Link to="/login" state={{ from: '/comunidad' }} className="font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
                  Inicia sesión
                </Link>{' '}para votar
              </p>
            ) : (
              <div className="space-y-1.5">
                {options?.map(opt => (
                  <PollOptionButton key={opt?.id} option={opt} disabled={voting} onSelect={handleSelect} />
                ))}
                {changingVote && (
                  <button
                    type="button"
                    onClick={() => setChangingVote(false)}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            )
          ) : (
            <div className="space-y-2">
              {options?.map(opt => (
                <PollResultsBar
                  key={opt?.id}
                  option={opt}
                  totalVotes={totalVotes}
                  isSelected={opt?.id === localVote}
                  isWinner={opt?.id === winningOptionId}
                />
              ))}
              {!isClosed && localVote && (
                <button
                  type="button"
                  onClick={() => setChangingVote(true)}
                  className="text-xs font-medium mt-1"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Cambiar voto
                </button>
              )}
            </div>
          )}
          {voteError && <p className="text-xs mt-1.5" style={{ color: 'var(--color-error)' }}>{voteError}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--color-primary)' }}>
              {post?.author?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="text-xs text-muted-foreground">{post?.author?.full_name || 'Usuario'}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Icon name="MessageSquare" size={13} color="currentColor" />
              <span>{post?.reply_count || 0}</span>
            </div>
            <span className="text-xs text-muted-foreground">{totalVotes} voto{totalVotes !== 1 ? 's' : ''}</span>
            <PollCountdown closesAt={poll?.closes_at} isClosed={isClosed} />
          </div>
        </div>
      </div>
    </div>
  );
}
